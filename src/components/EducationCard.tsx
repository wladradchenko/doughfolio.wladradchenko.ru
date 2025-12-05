import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { EducationCard as EducationCardType } from '../utils/cryptoEducation';

type Props = {
  card: EducationCardType;
  onClose?: () => void;
};

export const EducationCard = ({ card, onClose }: Props) => {
  const getIconName = () => {
    switch (card.icon) {
      case 'help':
        return 'help-outline';
      case 'lightbulb':
        return 'lightbulb-outline';
      case 'info':
      default:
        return 'info-outline';
    }
  };

  const getIconColor = () => {
    switch (card.icon) {
      case 'help':
        return '#9B59B6';
      case 'lightbulb':
        return '#F39C12';
      case 'info':
      default:
        return '#3498DB';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
          <MaterialIcons name={getIconName()} size={wp('6%')} color={getIconColor()} />
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={wp('4%')} color="#7A5B64" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.description}>{card.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: hp('2%'),
    marginVertical: hp('1%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  iconContainer: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: wp('1%'),
  },
  title: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#2B1D27',
    marginBottom: hp('1%'),
  },
  description: {
    fontSize: wp('3.5%'),
    color: '#7A5B64',
    lineHeight: wp('5%'),
  },
});

