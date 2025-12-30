import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Message, MulticastMessage } from 'firebase-admin/messaging';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging;

  onModuleInit() {
    try {
      // Check if Firebase app already exists
      let app: admin.app.App;

      if (admin.apps.length === 0) {
        // Initialize Firebase Admin SDK for the first time
        const serviceAccountPath = path.join(
          process.cwd(),
          'service-account-key.json',
        );

        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });

        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        // Use existing Firebase app
        app = admin.app();
        this.logger.log('Using existing Firebase Admin SDK instance');
      }

      this.messaging = app.messaging();
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  /**
   * Send push notification to a single device
   */
  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string,
  ): Promise<boolean> {
    try {
      const message: Message = {
        token: fcmToken,
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'skinalyze_notifications',
            sound: 'default',
            priority: 'high',
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);

      // If token is invalid, return false so service can mark token as inactive
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Send push notification to multiple devices (batch)
   */
  async sendToMultipleDevices(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    try {
      const message: MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channelId: 'skinalyze_notifications',
            sound: 'default',
            priority: 'high',
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.sendEachForMulticast(message);

      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(fcmTokens[idx]);
        }
      });

      this.logger.log(
        `Batch push notification sent: ${response.successCount} success, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error('Failed to send batch push notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to a topic (for broadcast messages)
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string,
  ): Promise<boolean> {
    try {
      const message: Message = {
        topic,
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: data || {},
      };

      const response = await this.messaging.send(message);
      this.logger.log(`Topic notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send topic notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe device tokens to a topic
   */
  async subscribeToTopic(fcmTokens: string[], topic: string): Promise<boolean> {
    try {
      const response = await this.messaging.subscribeToTopic(fcmTokens, topic);
      this.logger.log(
        `Subscribed ${response.successCount} devices to topic: ${topic}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   */
  async unsubscribeFromTopic(
    fcmTokens: string[],
    topic: string,
  ): Promise<boolean> {
    try {
      const response = await this.messaging.unsubscribeFromTopic(
        fcmTokens,
        topic,
      );
      this.logger.log(
        `Unsubscribed ${response.successCount} devices from topic: ${topic}`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to unsubscribe from topic:', error);
      throw error;
    }
  }
}
