import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';

export default function AccountsScreen() {
  const { colors } = useTheme();

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiService.getAccounts(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'checking':
      case 'current':
        return 'card-outline';
      case 'savings':
        return 'wallet-outline';
      case 'credit':
        return 'card';
      case 'investment':
        return 'trending-up-outline';
      default:
        return 'bank-outline';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 24,
      paddingTop: 60,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContainer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    accountCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    accountIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    accountType: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    accountBalance: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'right',
    },
    accountDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailItem: {
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
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
      marginBottom: 32,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 12,
    },
    primaryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!accounts || accounts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Accounts</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bank-outline" size={80} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Accounts Yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect your UK bank account or add accounts manually to start tracking your finances
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {accounts.map((account: any) => (
          <TouchableOpacity key={account.id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.accountIcon}>
                <Ionicons 
                  name={getAccountIcon(account.type)} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>{account.type}</Text>
              </View>
              <Text style={styles.accountBalance}>
                {formatCurrency(account.balance)}
              </Text>
            </View>
            
            <View style={styles.accountDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Account Number</Text>
                <Text style={styles.detailValue}>
                  ****{account.accountNumber?.slice(-4) || '0000'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Sort Code</Text>
                <Text style={styles.detailValue}>
                  {account.sortCode || '00-00-00'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>
                  {account.currency || 'GBP'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}