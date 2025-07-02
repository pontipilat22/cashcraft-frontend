import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Clipboard,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLocalization } from '../context/LocalizationContext';
import { useSubscription } from '../context/SubscriptionContext';
import { DataExportImportService } from '../services/dataExportImport';
import { useData } from '../context/DataContext';

export const ExportImportScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLocalization();
  const { isPremium } = useSubscription();
  const { refreshData } = useData();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportedData, setExportedData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleExport = async () => {
    if (!isPremium) {
      Alert.alert(
        t('premium.required'),
        t('premium.exportRequiresPremium'),
        [
          { text: t('common.ok'), style: 'default' }
        ]
      );
      return;
    }

    try {
      setIsExporting(true);
      const csvData = await DataExportImportService.exportToCSV();
      setExportedData(csvData);
      setShowExportModal(true);
      
      // Сохраняем экспорт
      await DataExportImportService.saveExportToStorage(csvData);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t('export.errorExporting')
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = () => {
    Clipboard.setString(exportedData);
    Alert.alert(
      t('common.success'),
      t('export.copiedToClipboard')
    );
  };

  const handleImport = async () => {
    if (!isPremium) {
      Alert.alert(
        t('premium.required'),
        t('premium.importRequiresPremium'),
        [
          { text: t('common.ok'), style: 'default' }
        ]
      );
      return;
    }

    if (!importData.trim()) {
      Alert.alert(
        t('common.error'),
        t('import.pasteDataFirst')
      );
      return;
    }

    Alert.alert(
      t('import.confirmTitle'),
      t('import.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.import'), 
          style: 'destructive',
          onPress: performImport
        }
      ]
    );
  };

  const performImport = async () => {
    try {
      setIsImporting(true);
      await DataExportImportService.importFromCSV(importData);
      await refreshData();
      
      Alert.alert(
        t('common.success'),
        t('import.successMessage')
      );
      
      setImportData('');
      setShowImportModal(false);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('import.errorImporting')
      );
    } finally {
      setIsImporting(false);
    }
  };

  const getExportPreview = () => {
    if (!exportedData) return null;
    return DataExportImportService.formatExportPreview(exportedData);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('export.title') || 'Экспорт и импорт данных'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('export.subtitle') || 'Создайте резервную копию или перенесите данные'}
          </Text>
        </View>

        {/* Экспорт */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('export.exportData') || 'Экспорт данных'}
            </Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              {t('export.exportDescription') || 'Выгрузить все данные в CSV формат'}
            </Text>
          </View>
          {isExporting && <ActivityIndicator color={colors.primary} />}
        </TouchableOpacity>

        {/* Импорт */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => setShowImportModal(true)}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="cloud-download-outline" size={32} color={colors.warning} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {t('import.importData') || 'Импорт данных'}
            </Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              {t('import.importDescription') || 'Загрузить данные из CSV файла'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Информация */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('export.info') || 'CSV файлы можно открыть в Excel, Google Sheets или любой другой программе для работы с таблицами'}
          </Text>
        </View>

        {!isPremium && (
          <View style={[styles.premiumCard, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
            <Text style={[styles.premiumText, { color: colors.primary }]}>
              {t('export.premiumFeature') || 'Эта функция доступна только для Premium пользователей'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Модальное окно экспорта */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('export.exportComplete') || 'Экспорт завершен'}
              </Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {getExportPreview() && (
              <View style={styles.exportStats}>
                <Text style={[styles.statsTitle, { color: colors.text }]}>
                  {t('export.exported') || 'Экспортировано:'}
                </Text>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('accounts.title') || 'Счета'}:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {getExportPreview()!.accounts}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('transactions.title') || 'Транзакции'}:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {getExportPreview()!.transactions}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('categories.title') || 'Категории'}:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {getExportPreview()!.categories}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('debts.title') || 'Долги'}:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {getExportPreview()!.debts}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('export.size') || 'Размер'}:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {getExportPreview()!.totalSize}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleCopyToClipboard}
            >
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {t('export.copyToClipboard') || 'Скопировать в буфер обмена'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('export.hint') || 'Вставьте скопированный текст в текстовый файл и сохраните с расширением .csv'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Модальное окно импорта */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('import.importData') || 'Импорт данных'}
              </Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.importInstruction, { color: colors.textSecondary }]}>
              {t('import.instruction') || 'Вставьте содержимое CSV файла:'}
            </Text>

            <TextInput
              style={[styles.importInput, { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              multiline
              placeholder={t('import.placeholder') || 'Вставьте данные CSV здесь...'}
              placeholderTextColor={colors.textSecondary}
              value={importData}
              onChangeText={setImportData}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { 
                backgroundColor: colors.primary,
                opacity: importData.trim() ? 1 : 0.5
              }]}
              onPress={handleImport}
              disabled={!importData.trim() || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {t('common.import') || 'Импортировать'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  premiumText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  exportStats: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  importInstruction: {
    fontSize: 14,
    marginBottom: 12,
  },
  importInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 16,
  },
}); 