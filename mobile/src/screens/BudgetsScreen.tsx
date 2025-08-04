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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';

export default function BudgetsScreen() {
  const { colors } = useTheme();

  const { data: budgets, isLoading, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => apiService.getBudgets(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getBudgetProgress = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  const getBudgetStatus = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'over';
    if (percentage >= 80) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over':
        return colors.error;
      case 'warning':
        return colors.warning;
      default:
        return colors.success;
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
    budgetCard: {
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
    budgetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    budgetInfo: {
      flex: 1,
    },
    budgetName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    budgetPeriod: {
      fontSize: 14,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    budgetStatus: {
      alignItems: 'flex-end',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    percentageText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    progressContainer: {
      marginBottom: 16,
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    spentText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    limitText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    budgetDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 16,
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

  if (!budgets || budgets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Budgets</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="pie-chart-outline" size={80} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No Budgets Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first budget to track your spending and stay on top of your finances
          </Text>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Create Budget</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
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
        {budgets.map((budget: any) => {
          const progress = getBudgetProgress(budget.spent, budget.limit);
          const status = getBudgetStatus(budget.spent, budget.limit);
          const statusColor = getStatusColor(status);
          const remaining = Math.max(budget.limit - budget.spent, 0);
          
          return (
            <TouchableOpacity key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <View style={styles.budgetInfo}>
                  <Text style={styles.budgetName}>{budget.name}</Text>
                  <Text style={styles.budgetPeriod}>{budget.period}</Text>
                </View>
                <View style={styles.budgetStatus}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {status === 'over' ? 'Over Budget' : status === 'warning' ? 'Almost There' : 'On Track'}
                  </Text>
                  <Text style={styles.percentageText}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={status === 'over' ? [colors.error, colors.error] : 
                           status === 'warning' ? [colors.warning, colors.warning] : 
                           [colors.success, colors.success]}
                    style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
                  />
                </View>
                <View style={styles.progressText}>
                  <Text style={styles.spentText}>
                    {formatCurrency(budget.spent)} spent
                  </Text>
                  <Text style={styles.limitText}>
                    of {formatCurrency(budget.limit)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.budgetDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Remaining</Text>
                  <Text style={[styles.detailValue, { color: remaining > 0 ? colors.success : colors.error }]}>
                    {formatCurrency(remaining)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {budget.category || 'General'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Days Left</Text>
                  <Text style={styles.detailValue}>
                    {budget.daysLeft || '30'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}