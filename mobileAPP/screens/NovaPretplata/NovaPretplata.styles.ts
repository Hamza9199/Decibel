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
    paddingBottom: 100,
  },
  content: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(35, 35, 35, 0.97)',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 1,
  },
  subscriptionDetails: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#b91d95',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  form: {
    gap: 18,
  },
  label: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 18,
  },
  inputFocused: {
    borderColor: '#e754a2',
    borderWidth: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: '#3a0d2e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb3c6',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#1e3a2e',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#baffc9',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#b91d95',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonPressed: {
    backgroundColor: '#e754a2',
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#232323',
    borderColor: '#b91d95',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flex: 1,
  },
  cancelButtonText: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    
    backgroundColor: '#181818',
     height: '100%',
    width: '100%',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
    paddingHorizontal: 20,
  },
  notFoundText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  pickerCloseButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#b91d95',
    borderRadius: 6,
  },
  pickerCloseText: {
    color: '#fff',
    fontSize: 14,
  },
  pickerTitle: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 16,
    textAlign: 'center',
  },
});
  