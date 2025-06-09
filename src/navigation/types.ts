import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from './BottomTabNavigator';

export type AccountsScreenProps = BottomTabScreenProps<BottomTabParamList, 'Accounts'>;
export type TransactionsScreenProps = BottomTabScreenProps<BottomTabParamList, 'Transactions'>;
export type MoreScreenProps = BottomTabScreenProps<BottomTabParamList, 'More'>; 