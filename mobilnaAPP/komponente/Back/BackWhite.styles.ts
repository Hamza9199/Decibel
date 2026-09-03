import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#181818',
    textAlign: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileImgMobile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});