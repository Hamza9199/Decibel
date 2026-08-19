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
    paddingHorizontal: 10,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  content: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'rgba(35, 35, 35, 0.97)',
    borderRadius: 18,
    padding: 15,
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
  noSongs: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  songCard: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 13,
    paddingHorizontal:5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songArtist: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 4,
  },
  songArtistRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  songDate: {
    color: '#ffe6ec',
    fontSize: 12,
    fontWeight: '500',
  },
  songActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  songActionsHeader: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 'auto',
  },
  actionButton: {
    backgroundColor: '#b91d95',
    borderRadius: 20,
    width: 31,
    height: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonLiked: {
    backgroundColor: '#e754a2',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 24, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  playlistItem: {
    backgroundColor: '#b91d95',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: '#181818',
    borderColor: '#b91d95',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalCloseBtnText: {
    color: '#ffe6ec',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSheetBackground: {
    backgroundColor: '#232323',
  },
  bottomSheetIndicator: {
    backgroundColor: '#b91d95',
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  bottomSheetList: {
    paddingBottom: 20,
  },
  playlistItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
});
