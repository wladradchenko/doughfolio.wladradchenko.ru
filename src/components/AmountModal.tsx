import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

type Props = {
  visible: boolean;
  currentAmount: number;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

const QUICK_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 10000;
const STEP = 100;

export const AmountModal = ({ visible, currentAmount, onClose, onConfirm }: Props) => {
  const [amount, setAmount] = useState(currentAmount);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAmount(currentAmount);
  }, [currentAmount, visible]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleIncrement = () => {
    setAmount(prev => Math.min(MAX_AMOUNT, prev + STEP));
  };

  const handleDecrement = () => {
    setAmount(prev => Math.max(MIN_AMOUNT, prev - STEP));
  };

  const handleQuickSelect = (value: number) => {
    setAmount(value);
  };

  const handleConfirm = () => {
    onConfirm(amount);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Select Amount</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={wp('6%')} color="#7A5B64" />
            </TouchableOpacity>
          </View>

          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Portfolio Value</Text>
            <Text style={styles.amountValue}>${amount.toLocaleString()}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handleDecrement}
              style={[styles.controlButton, amount <= MIN_AMOUNT && styles.controlButtonDisabled]}
              disabled={amount <= MIN_AMOUNT}
            >
              <MaterialIcons
                name="remove"
                size={wp('7%')}
                color={amount <= MIN_AMOUNT ? '#D0D0D0' : '#FF6E76'}
              />
            </TouchableOpacity>

            <View style={styles.stepInfo}>
              <Text style={styles.stepText}>Step: ${STEP}</Text>
            </View>

            <TouchableOpacity
              onPress={handleIncrement}
              style={[styles.controlButton, amount >= MAX_AMOUNT && styles.controlButtonDisabled]}
              disabled={amount >= MAX_AMOUNT}
            >
              <MaterialIcons
                name="add"
                size={wp('7%')}
                color={amount >= MAX_AMOUNT ? '#D0D0D0' : '#FF6E76'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.quickAmounts}>
            <Text style={styles.quickLabel}>Quick Select</Text>
            <View style={styles.quickGrid}>
              {QUICK_AMOUNTS.map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() => handleQuickSelect(value)}
                  style={[
                    styles.quickButton,
                    amount === value && styles.quickButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickButtonText,
                      amount === value && styles.quickButtonTextActive,
                    ]}
                  >
                    ${value >= 1000 ? `${value / 1000}k` : value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: wp('85%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: hp('2.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  closeButton: {
    padding: wp('1%'),
  },
  amountDisplay: {
    alignItems: 'center',
    marginVertical: hp('2%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#FFF3F6',
    borderRadius: 16,
  },
  amountLabel: {
    fontSize: wp('3.5%'),
    color: '#7A5B64',
    marginBottom: hp('0.5%'),
  },
  amountValue: {
    fontSize: wp('8%'),
    fontWeight: '700',
    color: '#FF6E76',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: hp('2%'),
    paddingHorizontal: wp('5%'),
  },
  controlButton: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    backgroundColor: '#FFE4E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6E76',
  },
  controlButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  stepInfo: {
    flex: 1,
    alignItems: 'center',
  },
  stepText: {
    fontSize: wp('3.2%'),
    color: '#7A5B64',
  },
  quickAmounts: {
    marginVertical: hp('2%'),
  },
  quickLabel: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#2B1D27',
    marginBottom: hp('1.5%'),
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  quickButton: {
    flex: 1,
    minWidth: wp('25%'),
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('3%'),
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickButtonActive: {
    backgroundColor: '#FFE4E8',
    borderColor: '#FF6E76',
  },
  quickButtonText: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#7A5B64',
  },
  quickButtonTextActive: {
    color: '#FF6E76',
    fontWeight: '700',
  },
  confirmButton: {
    marginTop: hp('2%'),
    paddingVertical: hp('2%'),
    backgroundColor: '#FF6E76',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6E76',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

