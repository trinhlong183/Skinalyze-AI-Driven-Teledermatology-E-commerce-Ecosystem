import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Animated } from 'react-native'
import React, { useState, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth'
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { useTranslation } from 'react-i18next';
import CustomAlert from './CustomAlert';

export default function HeaderComponent() {
  const [searchText, setSearchText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();
  const { unreadCount } = useNotificationWebSocket();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();

  // Animation refs
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.9)).current;

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const menuItems = [
    { name: t('profile.title'), icon: 'person', url: 'ProfileScreen' },
    { name: t('settings.title'), icon: 'settings', url: 'SettingsScreen' },
    { name: t('settings.about'), icon: 'information-circle', url: 'AboutScreen' },
    { name: t('profile.logout'), icon: 'log-out', url: 'WelcomeScreen' },
  ]

  const handleSearchFocus = () => {
    router.push('/(stacks)/SearchScreen');
  };

  const handleMenuPress = () => {
    if (menuVisible) {
      // Animate out
      Animated.parallel([
        Animated.timing(menuOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(menuScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      ]).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      // Animate in
      Animated.parallel([
        Animated.timing(menuOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(menuScale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }

  const handleNotificationPress = () => {
    router.push('/(tabs)/NotificationScreen');
  }

  const handleNavigate = async (path: string) => {
    handleMenuPress(); // Close menu with animation
    
    if (path === 'WelcomeScreen') {
      // Show CustomAlert for logout confirmation
      setAlertConfig({
        type: 'warning',
        title: t('profile.logout'),
        message: t('profile.logoutConfirm'),
        confirmText: t('profile.logout'),
        cancelText: t('profile.cancel'),
        onConfirm: async () => {
          setAlertVisible(false);
          await logout();
          router.replace('/WelcomeScreen' as any);
        },
        onCancel: () => {
          setAlertVisible(false);
        },
      });
      setAlertVisible(true);
    } else {
      router.push(path as any);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.searchContainer, { borderColor: `${primaryColor}20` }]}
        activeOpacity={0.8}
        onPress={handleSearchFocus}
      >
        <Ionicons name="search" size={20} color={primaryColor} style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>{t('header.searchPlaceholder')}</Text>
      </TouchableOpacity>
      
      {/* Notification Icon */}
      <TouchableOpacity 
        style={styles.notificationButton} 
        onPress={handleNotificationPress}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications-outline" size={28} color={primaryColor} />
        {unreadCount > 0 && (
          <Animated.View style={[styles.badge, { backgroundColor: primaryColor, transform: [{ scale: menuScale }] }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Profile Icon */}
      <TouchableOpacity style={styles.profileButton} onPress={handleMenuPress} activeOpacity={0.8}>
        <Ionicons name="person-circle-outline" size={32} color={primaryColor} />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="none" // Custom animation
        onRequestClose={handleMenuPress}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={handleMenuPress}
        >
          <Animated.View style={[styles.dropdownMenu, { opacity: menuOpacity, transform: [{ scale: menuScale }] }]}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder
                ]}
                onPress={() => handleNavigate(item.url)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={24} color={primaryColor} style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', 
    borderRadius: 24, 
    paddingHorizontal: 16,
    marginRight: 16,
    height: 44, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
    width: 44, 
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  profileButton: {
    padding: 6,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80, 
    paddingRight: 20,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    minWidth: 200, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});