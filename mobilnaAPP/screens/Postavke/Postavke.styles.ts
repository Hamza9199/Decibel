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
    paddingBottom: 140, // Increased padding for navigation bar + tabs
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(185, 29, 149, 0.1)',
  },
  spacer: {
    width: 40, // Same width as back button to center title
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    color: '#fff',
  },
  pickerItem: {
    color: '#fff',
    backgroundColor: '#181818',
  },
  linkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linkButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  linkText: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  additionalText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: '400',
    marginTop: 24,
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 24,
    minWidth: 320,
    maxWidth: width - 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTitleDelete: {
    color: '#e754a2',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  sendButton: {
    backgroundColor: '#1e90ff',
  },
  deleteButton: {
    backgroundColor: '#e754a2',
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
  