import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'
import { useThemeColor } from '@/contexts/ThemeColorContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter()
  const { primaryColor } = useThemeColor();

  const handleNavigate = (path: any) => {
    router.push(path)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Decorative Background Elements */}
      <View style={[styles.decorativeCircle1, { backgroundColor: primaryColor + '10' }]} />
      <View style={[styles.decorativeCircle2, { backgroundColor: primaryColor + '08' }]} />
      
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <View style={[styles.logoCircle, { backgroundColor: primaryColor }]}>
          <View style={styles.logoInnerCircle}>
            <Text style={styles.logoText}>S</Text>
          </View>
        </View>
        <Text style={styles.appName}>Skinalyze</Text>
        <View style={styles.taglineContainer}>
          <View style={[styles.taglineDot, { backgroundColor: primaryColor }]} />
          <Text style={styles.tagline}>AI-Powered Skin Analysis</Text>
          <View style={[styles.taglineDot, { backgroundColor: primaryColor }]} />
        </View>
      </View>

      {/* Content Section with Cards */}
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeDescription}>
          Get instant AI-powered analysis and personalized recommendations tailored to your unique skin needs
        </Text>
        
        {/* Feature Pills */}
        <View style={styles.featurePills}>
          <View style={[styles.pill, { borderColor: primaryColor }]}>
            <Text style={[styles.pillText, {color: primaryColor}]}>Smart Analysis</Text>
          </View>
          <View style={[styles.pill, { borderColor: primaryColor }]}>
            <Text style={[styles.pillText, {color: primaryColor}]}>Personalized</Text>
          </View>
          <View style={[styles.pill, { borderColor: primaryColor}]}>
            <Text style={[styles.pillText, {color: primaryColor}]}>Track Progress</Text>
          </View>
        </View>
      </View>

      {/* Buttons Section */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.loginButton, { backgroundColor: primaryColor }]}
          onPress={() => handleNavigate('/(stacks)/SignInScreen')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.registerButton, { borderColor: primaryColor + '40' }]}
          onPress={() => handleNavigate('/(stacks)/SignUpScreen')}
          activeOpacity={0.8}
        >
          <Text style={[styles.registerButtonText, { color: primaryColor }]}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Skinalyze? </Text>
          <TouchableOpacity onPress={() => handleNavigate('/(stacks)/SignUpScreen')}>
            <Text style={[styles.footerLink, { color: primaryColor }]}>Start free</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 100,
    left: -50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 50,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInnerCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
    marginBottom: 32,
    fontWeight: '400',
  },
  featurePills: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pill: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 14,
    paddingTop: 10,
  },
  loginButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  registerButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '400',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
})