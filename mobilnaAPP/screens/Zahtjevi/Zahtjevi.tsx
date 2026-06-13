import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './Zahtjevi.styles';

const Zahtjevi: React.FC = React.memo(() => {

    return (
        <View style={styles.container}>
            <Text>Zahtjevi</Text>
        </View>
    );
});

Zahtjevi.displayName = "Zahtjevi";

export default Zahtjevi;