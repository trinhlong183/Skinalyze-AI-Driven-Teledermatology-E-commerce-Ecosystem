import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  FindOptionsWhere,
  ILike,
  MoreThan,
  MoreThanOrEqual,
  LessThanOrEqual,
  Between,
} from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { OrderItem } from '../orders/entities/order-item.entity';
import { BadRequestException } from '@nestjs/common';
import { FindProductsDto } from './dto/find-products.dto';

export interface FindProductsResult {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly inventoryService: InventoryService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create product with URL-based images (links provided)
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;
    const categories = await this.categoryRepository.findBy({
      categoryId: In(categoryIds),
    });

    const product = this.productRepository.create({
      ...productData,
      categories,
    });

    const savedProduct = await this.productRepository.save(product);

    // Automatically create inventory record for new product
    // Use stock and originalPrice from CreateProductDto if provided
    await this.inventoryService.setStock(
      savedProduct.productId,
      createProductDto.stock || 0,
      createProductDto.originalPrice || 0, // originalPrice (cost price)
    );

    return savedProduct;
  }

  /**
   * Create product with uploaded image files (Cloudinary upload)
   */
  async createWithUpload(
    createProductDto: Omit<CreateProductDto, 'productImages'>,
    files: Express.Multer.File[],
  ): Promise<Product> {
    const imageUrls: string[] = [];

    // Upload files to Cloudinary
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file),
      );
      const uploadedImages = await Promise.all(uploadPromises);
      imageUrls.push(...uploadedImages.map((img) => img.secure_url));
    }

    // Create product with uploaded image URLs
    const productDto: CreateProductDto = {
      ...createProductDto,
      productImages: imageUrls,
    } as CreateProductDto;

    return this.create(productDto);
  }

  async findAll(
    filters: FindProductsDto = {} as FindProductsDto,
  ): Promise<FindProductsResult> {
    const {
      search,
      categoryId,
      brand,
      minPrice,
      maxPrice,
      inStock,
      page = 1,
      limit = 10,
    } = filters;

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const baseWhere: FindOptionsWhere<Product> = {};

    if (brand) {
      baseWhere.brand = ILike(brand);
    }

    if (categoryId) {
      baseWhere.categories = { categoryId };
    }

    if (inStock === true) {
      baseWhere.stock = MoreThan(0);
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      baseWhere.sellingPrice = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      baseWhere.sellingPrice = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      baseWhere.sellingPrice = LessThanOrEqual(maxPrice);
    }

    let where: FindOptionsWhere<Product> | FindOptionsWhere<Product>[] =
      baseWhere;

    if (search) {
      const pattern = `%${search}%`;
      where = [
        { ...baseWhere, productName: ILike(pattern) },
        { ...baseWhere, productDescription: ILike(pattern) },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.productRepository.findAndCount({
      where,
      relations: ['categories'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { productId: id },
      relations: ['categories'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  /**
   * Update product with data and/or images
   * Handles both product data updates and image management in one call
   */
  async updateWithImages(
    id: string,
    updateData: Partial<UpdateProductDto>,
    imagesToKeep?: string[],
    files?: Express.Multer.File[],
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Update basic product data
    if (updateData.productName) product.productName = updateData.productName;
    if (updateData.productDescription)
      product.productDescription = updateData.productDescription;
    if (updateData.stock !== undefined) product.stock = updateData.stock;
    if (updateData.brand) product.brand = updateData.brand;
    if (updateData.sellingPrice !== undefined)
      product.sellingPrice = updateData.sellingPrice;
    if (updateData.ingredients) product.ingredients = updateData.ingredients;
    if (updateData.suitableFor) product.suitableFor = updateData.suitableFor;
    if (updateData.salePercentage !== undefined)
      product.salePercentage = updateData.salePercentage;

    // Update categories if provided
    if (updateData.categoryIds && updateData.categoryIds.length > 0) {
      const categories = await this.categoryRepository.findBy({
        categoryId: In(updateData.categoryIds),
      });
      product.categories = categories;
    }

    // Handle image updates if imagesToKeep or files are provided
    if (imagesToKeep !== undefined || (files && files.length > 0)) {
      const imageUrls: string[] = [];

      // Keep selected old images
      if (imagesToKeep && imagesToKeep.length > 0) {
        imageUrls.push(...imagesToKeep);
      }

      // Upload new files to Cloudinary
      if (files && files.length > 0) {
        const uploadPromises = files.map((file) =>
          this.cloudinaryService.uploadImage(file),
        );
        const uploadedImages = await Promise.all(uploadPromises);
        imageUrls.push(...uploadedImages.map((img) => img.secure_url));
      }

      product.productImages = imageUrls;
    }

    return await this.productRepository.save(product);
  }

  /**
   * Update product images: keep selected old ones + upload new files
   */
  async updateImages(
    id: string,
    imagesToKeep: string[],
    files: Express.Multer.File[],
  ): Promise<Product> {
    const product = await this.findOne(id);
    const imageUrls: string[] = [];

    // Keep selected old images
    if (imagesToKeep && imagesToKeep.length > 0) {
      imageUrls.push(...imagesToKeep);
    }

    // Upload new files to Cloudinary
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) =>
        this.cloudinaryService.uploadImage(file),
      );
      const uploadedImages = await Promise.all(uploadPromises);
      imageUrls.push(...uploadedImages.map((img) => img.secure_url));
    }

    // Update product with new image array
    product.productImages = imageUrls;
    return await this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    // Check if product has any orders
    const orderCount = await this.orderItemRepository.count({
      where: { productId: id },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete product. It has ${orderCount} order(s) associated with it. Consider marking it as unavailable instead.`,
      );
    }

    // CASCADE will automatically delete inventory and adjustments
    await this.productRepository.remove(product);
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    // Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Query products with JOIN on product_categories
    return await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.categories', 'category')
      .where('category.categoryId = :categoryId', { categoryId })
      .leftJoinAndSelect('product.categories', 'productCategories')
      .getMany();
  }

  async findByBrand(brand: string): Promise<Product[]> {
    return await this.productRepository.find({ where: { brand } });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(product.productName) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('LOWER(product.productDescription) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .getMany();
  }
}
