import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ResponseHelper } from '../utils/responses';
import { FindProductsDto } from './dto/find-products.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product with image URLs (Admin only)' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return ResponseHelper.created('Product created successfully', product);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5)) // Max 5 images
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create product with uploaded images (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        productDescription: { type: 'string' },
        stock: { type: 'number' },
        categoryIds: { type: 'array', items: { type: 'string' } },
        brand: { type: 'string' },
        sellingPrice: { type: 'number' },
        originalPrice: { type: 'number' },
        ingredients: { type: 'string' },
        suitableFor: { type: 'array', items: { type: 'string' } },
        salePercentage: { type: 'number' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Upload image files (max 5)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Product created with uploaded images',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createWithUpload(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Parse FormData fields (everything comes as strings)
    const createProductDto: Omit<CreateProductDto, 'productImages'> = {
      productName: body.productName,
      productDescription: body.productDescription,
      stock: parseInt(body.stock, 10),
      categoryIds:
        typeof body.categoryIds === 'string'
          ? JSON.parse(body.categoryIds)
          : body.categoryIds,
      brand: body.brand,
      sellingPrice: parseFloat(body.sellingPrice),
      originalPrice: parseFloat(body.originalPrice),
      ingredients: body.ingredients,
      suitableFor:
        typeof body.suitableFor === 'string'
          ? JSON.parse(body.suitableFor)
          : body.suitableFor,
      salePercentage: body.salePercentage
        ? parseFloat(body.salePercentage)
        : undefined,
    };

    const product = await this.productsService.createWithUpload(
      createProductDto,
      files,
    );
    return ResponseHelper.created(
      'Product created with uploaded images',
      product,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Returns all products' })
  async findAll(@Query() filters: FindProductsDto) {
    const products = await this.productsService.findAll(filters);
    return ResponseHelper.success('Products retrieved successfully', products);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by name or description' })
  @ApiQuery({ name: 'q', type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Returns matching products' })
  async search(@Query('q') query: string) {
    const products = await this.productsService.searchProducts(query);
    return ResponseHelper.success('Products found', products);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiParam({ name: 'category', type: String, description: 'Product category' })
  @ApiResponse({ status: 200, description: 'Returns products in the category' })
  async findByCategory(@Param('category') category: string) {
    const products = await this.productsService.findByCategory(category);
    return ResponseHelper.success(
      `Products in category '${category}' retrieved successfully`,
      products,
    );
  }

  @Get('brand/:brand')
  @ApiOperation({ summary: 'Get products by brand' })
  @ApiParam({ name: 'brand', type: String, description: 'Product brand' })
  @ApiResponse({ status: 200, description: 'Returns products of the brand' })
  async findByBrand(@Param('brand') brand: string) {
    const products = await this.productsService.findByBrand(brand);
    return ResponseHelper.success(
      `Products of brand '${brand}' retrieved successfully`,
      products,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Returns the product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    return ResponseHelper.success('Product retrieved successfully', product);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5)) // Max 5 new images
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update product (with optional image upload) (Admin only)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productName: { type: 'string' },
        productDescription: { type: 'string' },
        stock: { type: 'number' },
        categoryIds: { type: 'array', items: { type: 'string' } },
        brand: { type: 'string' },
        sellingPrice: { type: 'number' },
        ingredients: { type: 'string' },
        suitableFor: { type: 'array', items: { type: 'string' } },
        salePercentage: { type: 'number' },
        imagesToKeep: {
          type: 'array',
          items: { type: 'string' },
          description: 'Existing image URLs to keep',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'New image files to upload (max 5)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Parse FormData fields
    const updateData: Partial<UpdateProductDto> = {};

    if (body.productName) updateData.productName = body.productName;
    if (body.productDescription)
      updateData.productDescription = body.productDescription;
    if (body.stock) updateData.stock = parseInt(body.stock, 10);
    if (body.brand) updateData.brand = body.brand;
    if (body.sellingPrice)
      updateData.sellingPrice = parseFloat(body.sellingPrice);
    if (body.ingredients) updateData.ingredients = body.ingredients;
    if (body.salePercentage)
      updateData.salePercentage = parseFloat(body.salePercentage);

    if (body.categoryIds) {
      updateData.categoryIds =
        typeof body.categoryIds === 'string'
          ? JSON.parse(body.categoryIds)
          : body.categoryIds;
    }

    if (body.suitableFor) {
      updateData.suitableFor =
        typeof body.suitableFor === 'string'
          ? JSON.parse(body.suitableFor)
          : body.suitableFor;
    }

    // Parse imagesToKeep
    const imagesToKeep = body.imagesToKeep
      ? typeof body.imagesToKeep === 'string'
        ? JSON.parse(body.imagesToKeep)
        : body.imagesToKeep
      : undefined;

    const product = await this.productsService.updateWithImages(
      id,
      updateData,
      imagesToKeep,
      files,
    );
    return ResponseHelper.success('Product updated successfully', product);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product by ID (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Product UUID' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
    return ResponseHelper.success('Product deleted successfully');
  }
}
