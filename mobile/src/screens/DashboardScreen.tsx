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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();

  // Fetch data
  const { data: netWorth, isLoading: netWorthLoading, refetch: refetchNetWorth } = useQuery({
    queryKey: ['networth'],
    queryFn: () => apiService.getNetWorth(),
  });

  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiService.getAccounts(),
  });

  const { data: bankingStatus, isLoading: bankingLoading, refetch: refetchBanking } = useQuery({
    queryKey: ['banking-status'],
    queryFn: () => apiService.getBankingStatus(),
  });

  const { data: budgets, isLoading: budgetsLoading, refetch: refetchBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiService.getBudgets(),
  });

  const isLoading = netWorthLoading || accountsLoading || bankingLoading || budgetsLoading;

  const onRefresh = () => {
    refetchNetWorth();
    refetchAccounts();
    refetchBanking();
    refetchBudgets();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      paddingBottom: 24,
    },
    header: {
      padding: 24,
      paddingTop: 60,
    },
    greeting: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    netWorthCard: {
      margin: 24,
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    netWorthLabel: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 8,
    },
    netWorthAmount: {
      fontSize: 36,
      fontWeight: 'bold',
      color: 'white',
      marginBottom: 8,
    },
    netWorthChange: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    sectionContainer: {
      marginHorizontal: 24,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    seeAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    cardAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusIcon: {
      marginBottom: 12,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    statusSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    connectButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    connectButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      padding: 24,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.subtitle}>Here's your financial overview</Text>
        </View>

        {/* Net Worth Card */}
        <LinearGradient
          colors={[colors.primary, '#0066CC']}
          style={styles.netWorthCard}
        >
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthAmount}>
            {netWorth ? formatCurrency(netWorth.currentNetWorth) : '£0.00'}
          </Text>
          <Text style={styles.netWorthChange}>
            Updated just now
          </Text>
        </LinearGradient>

        {/* Banking Status */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Banking</Text>
          </View>
          
          {bankingStatus?.connected ? (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardTitle}>UK Banking Connected</Text>
                  <Text style={styles.cardSubtitle}>
                    {bankingStatus.accountsCount} accounts synced
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            </View>
          ) : (
            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                <Ionicons name="bank-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={styles.statusTitle}>Connect Your UK Bank</Text>
              <Text style={styles.statusSubtitle}>
                Securely connect your UK bank account to automatically track your finances
              </Text>
              <TouchableOpacity style={styles.connectButton}>
                <Text style={styles.connectButtonText}>Connect Bank</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Accounts */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {accounts && accounts.length > 0 ? (
            accounts.slice(0, 3).map((account: any) => (
              <View key={account.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.cardTitle}>{account.name}</Text>
                    <Text style={styles.cardSubtitle}>{account.type}</Text>
                  </View>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(account.balance)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No accounts yet. Add your first account to get started.
              </Text>
            </View>
          )}
        </View>

        {/* Recent Budgets */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budgets</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {budgets && budgets.length > 0 ? (
            budgets.slice(0, 2).map((budget: any) => (
              <View key={budget.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.cardTitle}>{budget.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardAmount}>
                      {Math.round((budget.spent / budget.limit) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No budgets yet. Create your first budget to track spending.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}