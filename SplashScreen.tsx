import { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const SplashScreen = ({ onHide }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;


  const handleGetStarted = () => {
    Animated.parallel([
        Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
        toValue: 2, // можно уменьшить до 0.5 или 0.1, если хочешь схлопывание
        duration: 500,
        useNativeDriver: true,
        }),
    ]).start(() => onHide());
   };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <View>
        <Image 
            source={require('./assets/donuts/background.png')} 
            style={{ marginTop: hp('4.76%'), width: wp('109%'), height: hp('57.14%') }}
            resizeMode="contain">
        </Image>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Doughfolio</Text>
        <Text style={styles.description}>
          Visualize your crypto portfolio with delicious donut charts
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFD8DF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: wp('7.27%'),
    marginBottom: hp('7.61%'),
  },
  title: {
    fontSize: wp('14%'),
    fontWeight: 'bold',
    color: '#FF6E76',
    marginBottom: hp('1.9%'),
    textAlign: 'left'
  },
  description: {
    fontSize: wp('5.09%'),
    color: '#FF6E76',
    textAlign: 'left',
  },
  button: {
    backgroundColor: 'white',
    borderRadius: 28,

    // Тень для Android
    elevation: 10,

    // Тень для iOS
    shadowColor: '#9B8084',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,

    paddingHorizontal: wp('14.72%'),
    paddingVertical: hp('2%'),
    width: '80%',
    marginBottom: hp('5.71%'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: 'black',
    textTransform: 'uppercase',
    fontSize: wp('4.72%'),
    fontWeight: 'bold',
  },
});

export default SplashScreen;