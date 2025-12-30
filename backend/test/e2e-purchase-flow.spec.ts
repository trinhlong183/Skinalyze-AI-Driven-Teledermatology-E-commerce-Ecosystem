/**
 * 🛒 E2E TEST: COMPLETE PURCHASE & DELIVERY FLOW
 *
 * Test luồng mua hàng hoàn chỉnh từ A-Z:
 * 1. User login
 * 2. Add products to cart
 * 3. Checkout with payment methods (Banking auto-approve, COD needs approval)
 * 4. Staff approve/reject COD orders
 * 5. Shipping staff create batch delivery
 * 6. Complete delivery with photo proof
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('🛒 Complete Purchase Flow (e2e)', () => {
  let app: INestApplication;

  // Test users
  let customerToken: string;
  let customerUserId: string;
  let staffToken: string;
  let staffUserId: string;
  let adminToken: string;

  // Test data
  let productId1: string;
  let productId2: string;
  let cartId: string;
  let orderIdCOD: string;
  let orderIdBanking: string;
  let orderIdWallet: string;
  let batchCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  /**
   * 🔧 Setup test data: users, products
   */
  async function setupTestData() {
    // 1. Register & Login as Customer
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test-customer@example.com',
        password: 'password123',
        fullName: 'Test Customer',
        phone: '0901234567',
      });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test-customer@example.com',
        password: 'password123',
      });

    customerToken = loginResponse.body.data.accessToken;
    customerUserId = loginResponse.body.data.user.userId;

    // 2. Login as Staff
    const staffLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@skinalyze.com',
        password: 'staff123',
      });

    staffToken = staffLoginResponse.body.data.accessToken;
    staffUserId = staffLoginResponse.body.data.user.userId;

    // 3. Login as Admin
    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@skinalyze.com',
        password: 'admin123',
      });

    adminToken = adminLoginResponse.body.data.accessToken;

    // 4. Get test products
    const productsResponse = await request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200);

    productId1 = productsResponse.body.data[0]?.productId;
    productId2 = productsResponse.body.data[1]?.productId;
  }

  /**
   * 🧹 Cleanup test data
   */
  async function cleanupTestData() {
    // Delete test orders, cart, user if needed
    // Implementation depends on your database structure
  }

  describe('Step 1: 🔐 User Authentication', () => {
    it('should login successfully as customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test-customer@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe('test-customer@example.com');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test-customer@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Step 2: 🛒 Add Products to Cart', () => {
    it('should add first product to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: productId1,
          quantity: 2,
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      cartId = response.body.data.cartId;
    });

    it('should add second product to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: productId2,
          quantity: 1,
        })
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
    });

    it('should get cart items', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.totalPrice).toBeGreaterThan(0);
    });

    it('should update cart item quantity', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/cart/${productId1}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 3,
        })
        .expect(200);

      const updatedItem = response.body.data.items.find(
        (item: any) => item.productId === productId1,
      );
      expect(updatedItem.quantity).toBe(3);
    });
  });

  describe('Step 3: 💰 Checkout with Different Payment Methods', () => {
    describe('3a: COD Payment (Needs Staff Approval)', () => {
      it('should checkout with COD payment method', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            shippingAddress: '72 Thành Thái, Phường 14, Quận 10, TP.HCM',
            province: 'Hồ Chí Minh',
            district: 'Quận 10',
            ward: 'Phường 14',
            paymentMethod: 'cod',
            shippingMethod: 'INTERNAL',
            notes: 'Test COD order',
            selectedProductIds: [productId1],
          })
          .expect(200);

        expect(response.body.data.order).toBeDefined();
        expect(response.body.data.order.status).toBe('PENDING');
        expect(response.body.message).toContain('COD');
        orderIdCOD = response.body.data.order.orderId;
      });

      it('COD order should have PENDING status', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/orders/${orderIdCOD}`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body.data.status).toBe('PENDING');
        expect(response.body.data.payment.status).toBe('PENDING');
      });
    });

    describe('3b: Banking Payment (Auto-Approve)', () => {
      it('should checkout with banking payment method', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            shippingAddress: '72 Thành Thái, Phường 14, Quận 10, TP.HCM',
            province: 'Hồ Chí Minh',
            district: 'Quận 10',
            ward: 'Phường 14',
            paymentMethod: 'banking',
            shippingMethod: 'GHN',
            notes: 'Test banking order',
            selectedProductIds: [productId2],
          })
          .expect(200);

        expect(response.body.data.payment).toBeDefined();
        expect(response.body.data.payment.qrCodeUrl).toBeDefined();
        expect(response.body.data.payment.paymentCode).toBeDefined();
        expect(response.body.message).toContain('thanh toán');
      });

      // Note: Banking payment auto-approval happens via SePay webhook
      // In real test, you would simulate webhook callback
    });

    describe('3c: Wallet Payment (Instant Approval)', () => {
      it('should fail if wallet balance insufficient', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            shippingAddress: '72 Thành Thái, Phường 14, Quận 10, TP.HCM',
            paymentMethod: 'wallet',
            useWallet: true,
            shippingMethod: 'INTERNAL',
          })
          .expect(400);
      });

      it('should checkout with wallet if balance sufficient', async () => {
        // First, top up wallet (requires admin/staff)
        await request(app.getHttpServer())
          .post('/api/v1/transactions/topup')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: customerUserId,
            amount: 1000000, // 1M VND
          })
          .expect(201);

        // Then checkout with wallet
        const response = await request(app.getHttpServer())
          .post('/api/v1/orders/checkout')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            shippingAddress: '72 Thành Thái, Phường 14, Quận 10, TP.HCM',
            paymentMethod: 'wallet',
            useWallet: true,
            shippingMethod: 'INTERNAL',
          })
          .expect(200);

        expect(response.body.data.order.status).toBe('CONFIRMED');
        expect(response.body.data.order.payment.status).toBe('COMPLETED');
        orderIdWallet = response.body.data.order.orderId;
      });
    });
  });

  describe('Step 4: ✅ Staff Approve/Reject COD Orders', () => {
    it('should reject order with reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderIdCOD}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          reason: 'Out of stock',
        })
        .expect(200);

      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('should create new COD order for approval test', async () => {
      // Add product back to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: productId1,
          quantity: 1,
        });

      // Checkout
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddress: '72 Thành Thái, Phường 14, Quận 10, TP.HCM',
          paymentMethod: 'cod',
          shippingMethod: 'INTERNAL',
        })
        .expect(200);

      orderIdCOD = response.body.data.order.orderId;
    });

    it('should approve COD order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderIdCOD}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          processedBy: staffUserId,
          shippingMethod: 'INTERNAL',
        })
        .expect(200);

      expect(response.body.data.status).toBe('CONFIRMED');
      expect(response.body.data.payment.status).toBe('COMPLETED');
    });

    it('customer should not be able to approve their own order', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderIdCOD}/confirm`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          processedBy: customerUserId,
        })
        .expect(403);
    });
  });

  describe('Step 5: 📦 Shipping Staff Create Batch Delivery', () => {
    it('should get orders ready for batch delivery', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/shipping-logs/available')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should create batch delivery for multiple orders', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/shipping-logs/batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderIds: [orderIdCOD, orderIdWallet],
          shippingStaffId: staffUserId,
        })
        .expect(201);

      expect(response.body.data.batchCode).toBeDefined();
      expect(response.body.data.orders).toHaveLength(2);
      batchCode = response.body.data.batchCode;
    });

    it('should get batch details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/shipping-logs/batches/${batchCode}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.batchCode).toBe(batchCode);
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should pickup batch for delivery', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/shipping-logs/batches/${batchCode}/pickup`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          staffId: staffUserId,
        })
        .expect(200);

      expect(response.body.data[0].status).toBe('IN_TRANSIT');
    });
  });

  describe('Step 6: 📸 Complete Delivery with Photo Proof', () => {
    it('should update individual order status in batch', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/shipping-logs/batches/${batchCode}/orders/${orderIdCOD}`,
        )
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'DELIVERED',
          note: 'Customer received',
        })
        .expect(200);

      expect(response.body.data.status).toBe('DELIVERED');
    });

    it('should bulk update multiple orders', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/shipping-logs/batches/${batchCode}/bulk-update`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          updates: [
            {
              orderId: orderIdCOD,
              status: 'DELIVERED',
              note: 'Delivered successfully',
            },
            {
              orderId: orderIdWallet,
              status: 'DELIVERED',
              note: 'Delivered successfully',
            },
          ],
        })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((r: any) => r.success)).toBe(true);
    });

    it('should upload batch completion photos', async () => {
      // Note: In real test, you would use actual image file
      // Here we simulate the upload
      const response = await request(app.getHttpServer())
        .post(
          `/api/v1/shipping-logs/batches/${batchCode}/upload-completion-photos`,
        )
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('photos', Buffer.from('fake-image-data'), 'proof1.jpg')
        .attach('photos', Buffer.from('fake-image-data'), 'proof2.jpg')
        .expect(200);

      expect(response.body.data.photoUrls).toBeDefined();
      expect(response.body.data.photoUrls).toBeInstanceOf(Array);
    });

    it('should complete batch with photos and COD info', async () => {
      // First upload photos
      const uploadResponse = await request(app.getHttpServer())
        .post(
          `/api/v1/shipping-logs/batches/${batchCode}/upload-completion-photos`,
        )
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('photos', Buffer.from('fake-image-data'), 'proof.jpg')
        .expect(200);

      const photoUrls = uploadResponse.body.data.photoUrls;

      // Then complete batch
      const response = await request(app.getHttpServer())
        .post(`/api/v1/shipping-logs/batches/${batchCode}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          completionPhotos: photoUrls,
          completionNote: 'All orders delivered successfully',
          codCollected: true,
          totalCodAmount: 500000,
        })
        .expect(200);

      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.batchCompletionPhotos).toEqual(photoUrls);
    });

    it('should not allow completing same batch twice', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/shipping-logs/batches/${batchCode}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          completionPhotos: ['https://cloudinary.com/photo.jpg'],
        })
        .expect(400);
    });

    it('should verify orders are marked as DELIVERED', async () => {
      const response1 = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderIdCOD}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderIdWallet}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response1.body.data.status).toBe('COMPLETED');
      expect(response2.body.data.status).toBe('COMPLETED');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should not checkout with empty cart', async () => {
      // Remove all items from cart
      await request(app.getHttpServer())
        .delete('/api/v1/cart/clear')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddress: 'Test address',
          paymentMethod: 'cod',
        })
        .expect(400);
    });

    it('should not create batch with non-existent orders', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/shipping-logs/batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          orderIds: ['non-existent-order-id'],
          shippingStaffId: staffUserId,
        })
        .expect(404);
    });

    it('should not allow customer to complete batch', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/shipping-logs/batches/${batchCode}/complete`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          completionPhotos: ['https://cloudinary.com/photo.jpg'],
        })
        .expect(403);
    });

    it('should not checkout with invalid shipping address', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: productId1,
          quantity: 1,
        });

      await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddress: '', // Empty address
          paymentMethod: 'cod',
        })
        .expect(400);
    });
  });
});
