import React, { memo } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from './Loading.styles';
import { MaterialIcons } from '@expo/vector-icons';


const BouncingNote = ({
  delay,
}: {
  delay: number;
}) => {
  const translateY = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -24,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(500),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [delay, scale, translateY]);

 return (
  <Animated.View
    style={{
      transform: [
        { translateY },
        { scale },
      ],
    }}
  >
    <MaterialIcons
      name="music-note"
      size={32}
      color="#ffb6c1"
    />
  </Animated.View>
);
};

const Loading: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.loadingWrap}>
      <View style={styles.notes}>
        <BouncingNote delay={0} />
        <BouncingNote delay={250} />
        <BouncingNote delay={500} />
      </View>

      <Text style={styles.text}>
        {t('loading')}
      </Text>
    </View>
  );
};

export default memo(Loading);