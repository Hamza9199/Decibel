import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  loadingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    zIndex: 99999,

    backgroundColor: 'rgba(10,10,15,0.98)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  notes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',

    width: 120,
    height: 80,

    marginBottom: 18,
    gap: 14,
  },

  text: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});