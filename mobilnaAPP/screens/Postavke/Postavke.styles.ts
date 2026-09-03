import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    marginBottom: 50,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 140, 
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  spacer: {
    width: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2f2f2f',
  },
  label: {
    color: '#e0e0e0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  picker: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    color: '#ffffff',
  },
  pickerItem: {
    color: '#ffffff',
    backgroundColor: '#181818',
  },
  linkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkButton: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  linkText: {
    color: '#3b92f6',
    fontSize: 15,
    fontWeight: '600',
  },
  dangerLinkButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
  },
  dangerLinkText: {
    color: '#ff4d4d',
  },
  additionalText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#222222',
    borderRadius: 16,
    padding: 24,
    minWidth: 320,
    maxWidth: width - 40,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalTitleDelete: {
    color: '#ff4d4d',
  },
  modalText: {
    color: '#cccccc',
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333333',
  },
  sendButton: {
    backgroundColor: '#2563eb',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});