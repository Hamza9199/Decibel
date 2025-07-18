import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  audioPlayerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#232323',
    padding: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 100,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 12,
    zIndex: 10,
    padding: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Top Row Layout
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingTop: 4,
  },
  audioLogo: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 8,
    resizeMode: 'cover',
  },
  audioMeta: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  audioDetails: {
    marginBottom: 2,
  },
  audioTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },
  audioArtist: {
    color: '#b3b3b3',
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 2,
  },
  audioTime: {
    color: '#ffe6ec',
    fontSize: 11,
    fontWeight: '500',
  },
  loadingText: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Controls Row Layout
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  controlBtn: {
    backgroundColor: '#b91d95',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBtnDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
  },
  progressThumb: {
    width: 12,
    height: 12,
    backgroundColor: '#b91d95',
    borderRadius: 6,
  },

  // Bottom Row Layout
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  controlIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },

  // Volume Controls
  volumeSliderContainer: {
    flex: 1,
    maxWidth: 80,
    marginLeft: 4,
  },
  volumeTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#444',
  },
  volumeThumb: {
    width: 10,
    height: 10,
    backgroundColor: '#b91d95',
    borderRadius: 5,
  },

  // Rate Controls
  rateContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  rateLabel: {
    color: '#ffe6ec',
    fontSize: 8,
    marginBottom: 2,
  },
  rateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 120,
  },
  rateButton: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#b91d95',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    margin: 1,
    minWidth: 28,
    alignItems: 'center',
  },
  rateButtonActive: {
    backgroundColor: '#b91d95',
  },
  rateButtonDisabled: {
    backgroundColor: '#333',
    borderColor: '#666',
    opacity: 0.5,
  },
  rateButtonText: {
    color: '#ffe6ec',
    fontSize: 8,
    fontWeight: '500',
  },
  rateButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Mini Player
  miniPlayer: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    backgroundColor: '#232323',
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 200,
  },
  miniPlayerImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
  },
  miniPlayerText: {
    color: '#ffe6ec',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },

  // Modal Styles
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

  // Subscription Container
  subscriptionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#232323',
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  subscriptionText: {
    color: '#ffe6ec',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  subscriptionButton: {
    backgroundColor: '#b91d95',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscriptionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
