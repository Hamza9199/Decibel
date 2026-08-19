import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  bottomTabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: '#232323',
    borderTopWidth: 1,
    borderTopColor: '#b91d95',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingTop: 7,
    paddingHorizontal: 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  tabBarLabelActive: {
    color: '#b91d95',
  },
});
