import { StyleSheet, Dimensions } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#b91d95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
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
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#181818',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#ececec',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#b91d95',
  },
  tabText: {
    color: '#7a1f5e',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b91d95',
    borderRadius: 8,
    padding: 12,
    color: '#181818',
    fontSize: 16,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#7a1f5e',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 1,
    paddingLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#b91d95',
  },
  itemCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemArtist: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 4,
  },
  itemStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  approvedStatus: {
    backgroundColor: '#d8f5e0',
    color: '#1e7a44',
  },
  unapprovedStatus: {
    backgroundColor: '#fbdce9',
    color: '#a3175f',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  playButton: {
    backgroundColor: '#2ecc40',
  },
  approveButton: {
    backgroundColor: '#b91d95',
  },
  revokeButton: {
    backgroundColor: '#e754a2',
  },
  deleteButton: {
    backgroundColor: '#e53935',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    color: '#181818',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: '#fbdce9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#a3175f',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d8f5e0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#1e7a44',
    fontSize: 14,
    textAlign: 'center',
  },
});