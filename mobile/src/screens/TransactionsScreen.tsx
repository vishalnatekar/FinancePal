import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => apiService.getTransactions(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
      case 'groceries':
        return 'restaurant-outline';
      case 'transport':
      case 'transportation':
        return 'car-outline';
      case 'shopping':
        return 'bag-outline';
      case 'entertainment':
        return 'musical-notes-outline';
      case 'bills':
      case 'utilities':
        return 'flash-outline';
      case 'healthcare':
        return 'medical-outline';
      case 'income':
        return 'arrow-down-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const filteredTransactions = transactions?.filter((transaction: any) =>
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 60,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    scrollContainer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    transactionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    transactionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionCategory: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 8,
    },
    transactionAmount: {
      alignItems: 'flex-end',
    },
    amount: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    positiveAmount: {
      color: colors.success,
    },
    negativeAmount: {
      color: colors.text,
    },
    accountName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 48,
    },
    emptyIcon: {
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    emptySubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginVertical: 16,
    },
  });

  if (!transactions || transactions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect your bank account to automatically import your transactions
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons 
            name="search-outline" 
            size={20} 
            color={colors.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction: any, index: number) => {
            const isPositive = transaction.amount > 0;
            
            return (
              <TouchableOpacity key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  <Ionicons 
                    name={getCategoryIcon(transaction.category)} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Text style={styles.transactionCategory}>
                      {transaction.category}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amount,
                    isPositive ? styles.positiveAmount : styles.negativeAmount
                  ]}>
                    {isPositive ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                  <Text style={styles.accountName}>
                    {transaction.accountName || 'Unknown Account'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Results Found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with different keywords
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}