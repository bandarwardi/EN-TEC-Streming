import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface ContentRowProps {
  title: string;
  data: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactElement;
  onSeeAll?: () => void;
}

export function ContentRow({ title, data, renderItem, onSeeAll }: ContentRowProps) {
  const colors = useColors();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, flex: 1, marginRight: 16 }]} numberOfLines={1}>{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll}>
            <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>See all →</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
  }
});