import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

interface AccountSectionProps {
  title: string;
  count: number;
  children?: React.ReactNode;
  onAddPress: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  title,
  count,
  children,
  onAddPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
            size={20} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>{count}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {Boolean(isExpanded && React.Children.count(children) > 0) && (
        <View>
          {Array.isArray(children)
            ? children.filter(child =>
                child !== null &&
                child !== undefined &&
                !(typeof child === 'string' && child.trim() === '')
              ).map((child, idx) =>
                (typeof child === 'string' || typeof child === 'number')
                  ? <Text key={idx}>{child}</Text>
                  : React.isValidElement(child)
                    ? child
                    : null
              )
            : (typeof children === 'string' || typeof children === 'number')
              ? <Text>{children}</Text>
              : React.isValidElement(children)
                ? children
                : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  count: {
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    padding: 4,
  },
}); 