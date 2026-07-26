import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput } from 'react-native';
import { TVKeyboard } from './TVKeyboard';
import QRCode from 'react-native-qrcode-svg';
import { listenToRemoteKeyboard } from '@/store/firebase';
import { useColors } from '@/hooks/useColors';
import { TVFocusable } from './TVFocusable';

interface SearchKeyboardModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  placeholder?: string;
  inline?: boolean;
}

export function SearchKeyboardModal({ visible, value, onChangeText, onClose, placeholder, inline = false }: SearchKeyboardModalProps) {
  const colors = useColors();
  const remoteSessionId = useRef(Math.random().toString(36).substring(2, 6).toUpperCase()).current;
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value when prop changes (if it changes from outside)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (!visible) return;
    
    return listenToRemoteKeyboard(remoteSessionId, (text) => {
      setInternalValue(text);
      onChangeText(text);
    });
  }, [visible, remoteSessionId, onChangeText]);

  const handleChangeText = (t: string) => {
    setInternalValue(t);
    onChangeText(t);
  };

  if (!visible) return null;

  const content = (
    <View style={[inline ? styles.inlineContainer : styles.overlay, !inline && { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
      <View style={[styles.contentRow, inline && { flexDirection: 'column', gap: 16 }, !inline && { transform: [{ scale: 0.75 }] }]}>
        
        {/* Keyboard Section */}
        <View style={{ width: inline ? '100%' : 480, maxWidth: 480, paddingHorizontal: inline ? 16 : 0 }}>
          <TextInput
            value={internalValue}
            onChangeText={handleChangeText}
            placeholder={placeholder || 'Search...'}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.placeholder, { color: colors.gold, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16 }]}
            autoFocus={true}
            showSoftInputOnFocus={false}
            onSubmitEditing={onClose}
            returnKeyType="search"
          />
          <TVKeyboard 
            value={internalValue}
            onChangeText={handleChangeText}
            onSubmit={onClose}
            autoFocus={true}
            suggestions={[]}
          />
        </View>
        
        {/* QR Code Section */}
        <View style={[styles.qrContainer, inline && { flexDirection: 'row', padding: 16, width: '100%', maxWidth: 480, justifyContent: 'space-between', alignItems: 'center' }, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: colors.border }]}>
          {inline ? (
            <>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={[styles.qrTitle, { color: colors.text, marginBottom: 4 }]}>Remote Search</Text>
                <Text style={[styles.qrSessionId, { color: colors.gold, marginBottom: 12, fontSize: 20 }]}>{remoteSessionId}</Text>
                
                <TVFocusable 
                  onPress={onClose}
                  style={({ focused }: any) => [
                    styles.closeBtn,
                    { backgroundColor: focused ? colors.gold : 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 24 }
                  ]}
                >
                  {({ focused }: any) => (
                    <Text style={[styles.closeBtnText, { color: focused ? '#000' : colors.text }]}>Close</Text>
                  )}
                </TVFocusable>
              </View>
              <View style={[styles.qrCodeWrapper, { marginBottom: 0, padding: 8 }]}>
                <QRCode 
                  value={`https://entec-keyboard.web.app/?session=${remoteSessionId}`} 
                  size={90} 
                />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.qrTitle, { color: colors.text }]}>Remote Search</Text>
              <View style={styles.qrCodeWrapper}>
                <QRCode 
                  value={`https://entec-keyboard.web.app/?session=${remoteSessionId}`} 
                  size={140} 
                />
              </View>
              <Text style={[styles.qrSessionId, { color: colors.gold }]}>{remoteSessionId}</Text>
              
              <TVFocusable 
                onPress={onClose}
                style={({ focused }: any) => [
                  styles.closeBtn,
                  { backgroundColor: focused ? colors.gold : 'rgba(255,255,255,0.1)' }
                ]}
              >
                {({ focused }: any) => (
                  <Text style={[styles.closeBtnText, { color: focused ? '#000' : colors.text }]}>Close</Text>
                )}
              </TVFocusable>
            </>
          )}
        </View>

      </View>
    </View>
  );

  if (inline) {
    return content;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
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
  inlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    width: '100%',
  },
  placeholder: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  qrSessionId: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginBottom: 24,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  closeBtnText: {
    fontWeight: 'bold',
  }
});
