import React from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppStore } from '@/store/app-store';
import { useColors } from '@/hooks/useColors';
import { TVFocusable } from '@/components/TVFocusable';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Shield2Bulk } from '@lineiconshq/free-icons';

export function GlobalAlert() {
  const globalAlert = useAppStore((s) => s.globalAlert);
  const colors = useColors();

  if (!globalAlert) return null;

  const content = (
    <View style={styles.overlay}>
      <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} style={StyleSheet.absoluteFillObject} tint="dark" />
      <View style={[styles.alertBox, { backgroundColor: '#1A1A1A', borderColor: colors.gold }]}>
        <View style={styles.iconContainer}>
          <Lineicons icon={Shield2Bulk} size={48} color={colors.gold} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{globalAlert.title}</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{globalAlert.message}</Text>
        
        <View style={styles.buttonContainer}>
          <TVFocusable
            onPress={globalAlert.onPress}
            style={({ focused }: any) => [
              styles.button,
              { backgroundColor: focused ? colors.gold : '#2A2A2A' }
            ]}
            scaleAmount={1.05}
          >
            {({ focused }: any) => (
              <Text style={[styles.buttonText, { color: focused ? '#000000' : colors.text }]}>
                {globalAlert.buttonText}
              </Text>
            )}
          </TVFocusable>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 99999, elevation: 99999 }]}>
        {content}
      </View>
    );
  }

  return (
    <Modal transparent visible={!!globalAlert} animationType="fade" hardwareAccelerated>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 2,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  }
});
