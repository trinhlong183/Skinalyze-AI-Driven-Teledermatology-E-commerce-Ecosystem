import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  RefreshControl
} from 'react-native'
import React, { useState, useCallback } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import cartService, { Cart, CartItem } from '@/services/cartService'
import productService from '@/services/productService'
import tokenService from '@/services/tokenService'
import { useCartCount } from '@/hooks/userCartCount'
import { useThemeColor } from '@/contexts/ThemeColorContext'
import { useTranslation } from 'react-i18next'
import CustomAlert from '@/components/CustomAlert'

// Extended CartItem with product image
interface CartItemWithImage extends CartItem {
  productImage?: string;
}
 
export default function CartScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartItemsWithImages, setCartItemsWithImages] = useState<CartItemWithImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const { refreshCount } = useCartCount()
  const { primaryColor } = useThemeColor()

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false)
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
  })

  // Helper function to show alert
  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    confirmText: string = t('common.cancel'),
    onConfirm: () => void = () => {},
    cancelText?: string,
    onCancel?: () => void
  ) => {
    setAlertConfig({
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setAlertVisible(false)
        onConfirm()
      },
      onCancel: onCancel ? () => {
        setAlertVisible(false)
        onCancel()
      } : undefined,
    })
    setAlertVisible(true)
  }

  const fetchProductImages = useCallback(async (cartData: Cart) => {
    if (!cartData || cartData.items.length === 0) {
      setCartItemsWithImages([])
      return
    }

    try {
      const itemsWithImages = await Promise.all(
        cartData.items.map(async (item) => {
          try {
            const product = await productService.getProductById(item.productId)
            return {
              ...item,
              productImage: product.productImages?.[0] || undefined
            }
          } catch (error) {
            console.error(`Error fetching image for product ${item.productId}:`, error)
            return {
              ...item,
              productImage: undefined
            }
          }
        })
      )

      setCartItemsWithImages(itemsWithImages)
    } catch (error) {
      console.error('Error fetching product images:', error)
    }
  }, [])

  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = await tokenService.getToken()
      
      if (!token) {
        setError('Please log in to view your cart')
        setIsLoading(false)
        return
      }

      const cartData = await cartService.getUserCart()
      setCart(cartData)
      
      await fetchProductImages(cartData)
      await refreshCount()
      
      // Select all items by default
      const allProductIds = new Set(cartData.items.map(item => item.productId))
      setSelectedItems(allProductIds)
      setSelectAll(true)
    } catch (err) {
      console.error('Error loading cart:', err)
      setError('Failed to load cart')
    } finally {
      setIsLoading(false)
    }
  }, [fetchProductImages, refreshCount])

  useFocusEffect(
    useCallback(() => {
      console.log('📱 CartScreen focused - refreshing cart and badge')
      loadCart()
    }, [loadCart])
  )

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadCart()
    setIsRefreshing(false)
  }, [loadCart])

  const toggleSelectItem = useCallback((productId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      
      // Update select all state
      setSelectAll(newSet.size === cart?.items.length)
      
      return newSet
    })
  }, [cart?.items.length])

  const toggleSelectAll = useCallback(() => {
    if (!cart) return
    
    if (selectAll) {
      setSelectedItems(new Set())
      setSelectAll(false)
    } else {
      const allProductIds = new Set(cart.items.map(item => item.productId))
      setSelectedItems(allProductIds)
      setSelectAll(true)
    }
  }, [selectAll, cart])

  const calculateSelectedTotal = useCallback(() => {
    if (!cart) return { items: 0, price: 0 }
    
    const selectedCartItems = cart.items.filter(item => 
      selectedItems.has(item.productId)
    )
    
    return {
      items: selectedCartItems.reduce((sum, item) => sum + item.quantity, 0),
      price: selectedCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }
  }, [cart, selectedItems])

  const handleUpdateQuantity = useCallback(async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdatingItems(prev => new Set(prev).add(item.productId))

      const token = await tokenService.getToken()
      if (!token) {
        showAlert('error', t('cart.error'), t('cart.loginAgain'))
        return
      }

      const updatedCart = await cartService.updateCartItem(
        token,
        item.productId,
        { quantity: newQuantity }
      )

      setCart(updatedCart)
      await fetchProductImages(updatedCart)
      
      setTimeout(async () => {
        await refreshCount()
      }, 100)
    } catch (err) {
      console.error('Error updating quantity:', err)
      showAlert('error', t('cart.error'), t('cart.updateQuantityError'))
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.productId)
        return newSet
      })
    }
  }, [fetchProductImages, refreshCount, t])

  const handleRemoveItem = useCallback((item: CartItem) => {
    showAlert(
      'warning',
      t('cart.removeItem'),
      t('cart.removeConfirm', { itemName: item.productName }),
      t('cart.remove'),
      async () => {
        try {
          setUpdatingItems(prev => new Set(prev).add(item.productId))

          const token = await tokenService.getToken()
          if (!token) {
            showAlert('error', t('cart.error'), t('cart.loginAgain'))
            return
          }

          const updatedCart = await cartService.removeFromCart(token, item.productId)
          setCart(updatedCart)
          await fetchProductImages(updatedCart)
          
          // Remove from selected items
          setSelectedItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(item.productId)
            return newSet
          })
          
          setTimeout(async () => {
            await refreshCount()
          }, 100)
        } catch (err) {
          console.error('Error removing item:', err)
          showAlert('error', t('cart.error'), t('cart.removeItemError'))
        } finally {
          setUpdatingItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(item.productId)
            return newSet
          })
        }
      },
      t('cart.cancel'),
      () => {}
    )
  }, [fetchProductImages, refreshCount, t])

  const handleClearCart = useCallback(() => {
    if (!cart || cart.items.length === 0) return

    showAlert(
      'warning',
      t('cart.clearCart'),
      t('cart.clearConfirm'),
      t('cart.clearAll'),
      async () => {
        try {
          const token = await tokenService.getToken()
          if (!token) {
            showAlert('error', t('cart.error'), t('cart.loginAgain'))
            return
          }

          await cartService.clearCart(token)
          setSelectedItems(new Set())
          setSelectAll(false)
          await loadCart()
        } catch (err) {
          console.error('Error clearing cart:', err)
          showAlert('error', t('cart.error'), t('cart.loadError'))
        }
      },
      t('cart.cancel'),
      () => {}
    )
  }, [cart, loadCart, t])

  const handleCheckout = useCallback(() => {
    if (!cart || cart.items.length === 0) return
    
    if (selectedItems.size === 0) {
      showAlert('warning', t('cart.noItemsSelected'), t('cart.selectItemsToCheckout'))
      return
    }

    // Get selected product IDs as array
    const selectedProductIds = Array.from(selectedItems)
    
    router.push({
      pathname: '/(stacks)/CheckoutScreen',
      params: { 
        selectedProductIds: JSON.stringify(selectedProductIds)
      }
    })
  }, [cart, selectedItems, router, t])

  const renderCartItem = useCallback(({ item }: { item: CartItemWithImage }) => {
    const isUpdating = updatingItems.has(item.productId)
    const isSelected = selectedItems.has(item.productId)

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemHeader}>
          {/* Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleSelectItem(item.productId)}
            disabled={isUpdating}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxActive, {backgroundColor: primaryColor, borderColor: primaryColor}]}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.itemContent}
            onPress={() => router.push({
              pathname: '/(stacks)/ProductDetailScreen',
              params: { productId: item.productId }
            })}
          >
            {/* Product Image */}
            <View style={styles.itemImageContainer}>
              {item.productImage ? (
                <Image
                  source={{ uri: item.productImage }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="image-outline" size={40} color="#CCC" />
              )}
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.productName}
              </Text>
              <Text style={[styles.itemPrice, { color: primaryColor }]}>
                {productService.formatPrice(item.price)}
              </Text>
              <Text style={styles.itemSubtotal}>
                Subtotal: {productService.formatPrice(item.price * item.quantity)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.itemActions}>
          {/* Quantity Controls */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, isUpdating && styles.disabledButton]}
              onPress={() => handleUpdateQuantity(item, item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
            >
              <Ionicons 
                name="remove" 
                size={18} 
                color={item.quantity <= 1 || isUpdating ? '#CCC' : '#1A1A1A'} 
              />
            </TouchableOpacity>

            {isUpdating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.quantityText}>{item.quantity}</Text>
            )}

            <TouchableOpacity
              style={[styles.quantityButton, isUpdating && styles.disabledButton]}
              onPress={() => handleUpdateQuantity(item, item.quantity + 1)}
              disabled={isUpdating}
            >
              <Ionicons 
                name="add" 
                size={18} 
                color={isUpdating ? '#CCC' : '#1A1A1A'} 
              />
            </TouchableOpacity>
          </View>

          {/* Remove Button */}
          <TouchableOpacity
            style={[styles.removeButton, isUpdating && styles.disabledButton]}
            onPress={() => handleRemoveItem(item)}
            disabled={isUpdating}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }, [updatingItems, selectedItems, handleUpdateQuantity, handleRemoveItem, toggleSelectItem, router, primaryColor])

  const renderEmptyCart = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={100} color="#E5E5E5" />
      <Text style={styles.emptyTitle}>{t('cart.empty')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('cart.emptyDesc')}
      </Text>
      <TouchableOpacity
        style={[styles.shopButton, { backgroundColor: primaryColor }]}
        onPress={() => router.push('/(tabs)/HomeScreen')}
      >
        <Text style={styles.shopButtonText}>{t('cart.startShopping')}</Text>
      </TouchableOpacity>
    </View>
  ), [router, primaryColor, t])

  const renderLoginRequired = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="person-circle-outline" size={100} color="#E5E5E5" />
      <Text style={styles.emptyTitle}>{t('cart.loginRequiredTitle')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('cart.loginRequiredDesc')}
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => router.push('/WelcomeScreen' as any)}
      >
        <Text style={styles.shopButtonText}>{t('cart.logIn')}</Text>
      </TouchableOpacity>
    </View>
  ), [router, t])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>{t('cart.loading')}</Text>
      </View>
    )
  }

  if (error === 'Please log in to view your cart') {
    return renderLoginRequired()
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{t('cart.loadError')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCart}>
          <Text style={styles.retryButtonText}>{t('cart.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!cart || cart.items.length === 0) {
    return renderEmptyCart()
  }

  const selectedTotal = calculateSelectedTotal()

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.selectAllContainer}
            onPress={toggleSelectAll}
          >
            <View style={[styles.checkbox, selectAll && styles.checkboxActive, { backgroundColor: primaryColor, borderColor: primaryColor }]}>
              {selectAll && (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              )}
            </View>
            <Text style={styles.selectAllText}>{t('cart.all')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>{t('cart.title')}</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>{t('cart.clear')}</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cartItemsWithImages}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />

      {/* Bottom Summary */}
      <View style={styles.bottomContainer}>
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t('cart.selectedItems', { 
                count: selectedTotal.items, 
                item: selectedTotal.items === 1 ? t('cart.item') : t('cart.items') 
              })}
            </Text>
            <Text style={styles.summaryValue}>
              {productService.formatPrice(selectedTotal.price)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('cart.total')}</Text>
            <Text style={[styles.totalValue, { color: primaryColor }]}>
              {productService.formatPrice(selectedTotal.price)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.checkoutButton,
            selectedItems.size === 0 && styles.checkoutButtonDisabled,
            { backgroundColor: primaryColor }
          ]}
          onPress={handleCheckout}
          disabled={selectedItems.size === 0}
        >
          <Text style={styles.checkoutButtonText}>
            {t('cart.checkout', { count: selectedItems.size })}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* CustomAlert */}
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
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  checkboxContainer: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  itemContent: {
    flexDirection: 'row',
    flex: 1,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  itemSubtotal: {
    fontSize: 13,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingLeft: 36,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  quantityButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
  },
  bottomContainer: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    padding: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})