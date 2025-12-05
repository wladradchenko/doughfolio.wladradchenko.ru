import {StyleSheet, Text, Image, View, useWindowDimensions, Linking, TouchableOpacity, ActivityIndicator} from 'react-native';
import React from 'react';
import Animated, {FadeInDown, FadeOutDown} from 'react-native-reanimated';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { MaterialIcons } from '@expo/vector-icons';

interface Data {
  id: string;
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  image: string;
  url: string;
  decimals?: number;
}

type Props = {
  item: Data;
  index: number;
  donutImages: any[];
  onPress?: (item: Data) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
  isLoading?: boolean;
};

const getRandomRotation = () => {
  const angle = Math.floor(Math.random() * 21) - 10; // [-10, 10]
  return `${angle}deg`;
};


const RenderItem = ({item, index, donutImages, onPress, onRemove, showRemoveButton, isLoading = false}: Props) => {
  const {width} = useWindowDimensions();
  const donutImage = donutImages[index % donutImages.length]
  const handlePress = () => {
    if (onPress) {
      onPress(item);
    } else {
      // Fallback: Open the URL in the browser
      Linking.openURL(item.url).catch(err => console.error("Failed to open URL:", err));
    }
  };

  const handleRemove = (e: any) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  // If horizontal backgroundColor: 'transparent' else vertical backgroundColor: '#FFD8DF'
  
  return (
    <TouchableOpacity onPress={handlePress}>
      <Animated.View
        style={[styles.container, { width: width * 0.8, marginLeft: wp('5.45%'), overflow: 'visible', position: 'relative' }]}
        entering={FadeInDown.delay(index * 200)}
        exiting={FadeOutDown}>
        {showRemoveButton && onRemove && (
          <TouchableOpacity 
            onPress={handleRemove}
            style={styles.removeButton}
          >
            <MaterialIcons name="close" size={wp('4%')} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={[styles.contentContainer, { flexDirection: 'row', justifyContent: 'flex-start', gap: 20 }]}>
          <View style={{position: 'absolute', left: -wp('12.72%'), zIndex: 1, transform: [{ rotate: getRandomRotation() }]}}>
            <Image 
              source={donutImage} 
              style={[{width: wp('27.27%'), height: hp('14.28%')}]}
              resizeMode="contain">
            </Image>
          </View>
          <View style={[{width: wp('12.72%'), height: hp('3.8%'), marginLeft: -wp('5.45%'), marginRight: wp('5.45%'), backgroundColor: 'transparent'}]}></View>
          <View style={[{ flexDirection: 'column', gap: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="contain"
              />
              <Text style={[{ width: wp('45.45%'), color: 'black', fontSize: wp('5.09%') }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              {isLoading ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp('2%') }}>
                    <ActivityIndicator size="small" color="#FF6E76" />
                    <Text style={[styles.text, {fontSize: wp('3.5%'), color: '#666'}]}>Loading price data...</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.text}>{item.percentage}%</Text>
                  <Text style={[styles.text, {color: '#FF6E76'}]}>${item.value}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default RenderItem;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    marginBottom: hp('3.33%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 30,

     // Тень для iOS
    shadowColor: '#9B8084',
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: hp('1.9%'),
  },
  color: {
    width: wp('10.9%'),
    height: hp('5.71%'),
    borderRadius: 10,
  },
  emoji: {
    fontSize: wp('5.45%'), // Adjust font size to fit inside the square
    textAlign: 'center',
    marginTop: hp('0.76%'),
  },
  image: {
    width: wp('5.45%'),
    height: hp('2.85%')
  },
  text: {
    fontSize: wp('7.27%'),
    fontWeight: 'bold',
    color: 'black',
  },
  removeButton: {
    position: 'absolute',
    top: -wp('2%'),
    right: -wp('2%'),
    backgroundColor: '#FF6E76',
    borderRadius: wp('4%'),
    width: wp('8%'),
    height: wp('8%'),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
