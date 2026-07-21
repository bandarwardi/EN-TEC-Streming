import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TVFocusable, TVFocusableProps } from '@/components/TVFocusable';

interface GoldButtonProps extends Omit<TVFocusableProps, 'children'> {
  title: string;
  icon?: React.ReactNode;
}

export function GoldButton({ title, icon, style, ...props }: GoldButtonProps) {
  return (
    <TVFocusable disableBorder={true} style={style} {...props}>
      {({ focused }: any) => (
        <LinearGradient
          colors={focused ? ['#FDE08B', '#D4A843'] : ['#D4A843', '#A67C2E']}
          style={[styles.gradient, focused && { borderWidth: 2, borderColor: '#FFF' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon}
          <Text style={styles.title}>{title}</Text>
        </LinearGradient>
      )}
    </TVFocusable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 16,
  }
});