import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <View>
            <Text style={styles.title}>SAKU Mobile</Text>
            <Text style={styles.subtitle}>Financial OS v1.0</Text>
          </View>
        </View>

        {/* Net Worth Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TOTAL NET WORTH</Text>
          <Text style={styles.cardValue}>Rp 1.450.230.000</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>▲ +2.4% vs bulan lalu</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.buttonText}>+ Catat Transaksi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>📥 Import Mutasi</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rekening Utama</Text>

          <View style={styles.accountRow}>
            <Text style={styles.accountName}>Bank BCA</Text>
            <Text style={styles.accountBalance}>Rp 185.000.000</Text>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountName}>Bank Mandiri</Text>
            <Text style={styles.accountBalance}>Rp 60.000.000</Text>
          </View>

          <View style={styles.accountRow}>
            <Text style={styles.accountName}>MetaTrader 5 Forex</Text>
            <Text style={styles.accountBalance}>$25,400.00</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  tag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  tagText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  accountName: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  accountBalance: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
