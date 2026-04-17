import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ProfileRowProps {
	iconName: IconName;
	label: string;
	value?: string;
	onPress?: () => void;
	danger?: boolean;
}

export default function ProfileRow({
	iconName,
	label,
	value,
	onPress,
	danger = false,
}: ProfileRowProps) {
	return (
		<TouchableOpacity
			style={styles.row}
			onPress={onPress}
			activeOpacity={0.75}
			disabled={!onPress}
		>
			<View style={styles.left}>
				<View style={[styles.iconWrapper, danger && styles.iconWrapperDanger]}>
					<Ionicons
						name={iconName}
						size={20}
						color={danger ? '#FF6B6B' : '#20B27E'}
					/>
				</View>

				<Text style={[styles.label, danger && styles.labelDanger]}>
					{label}
				</Text>
			</View>

			<View style={styles.right}>
				{!!value && (
					<Text
						style={[styles.value, danger && styles.valueDanger]}
						numberOfLines={1}
					>
						{value}
					</Text>
				)}

				<Ionicons
					name='chevron-forward'
					size={18}
					color={danger ? '#FF6B6B' : '#98A2B3'}
				/>
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	row: {
		minHeight: 68,
		backgroundColor: '#FFFFFF',
		borderRadius: 18,
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 12,

		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',

		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 3,
	},

	left: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},

	right: {
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 1,
	},

	iconWrapper: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#EAF8F2',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	iconWrapperDanger: {
		backgroundColor: '#FFF1F1',
	},

	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},

	labelDanger: {
		color: '#FF6B6B',
	},

	value: {
		fontSize: 15,
		color: '#667085',
		marginRight: 6,
		maxWidth: 170,
	},

	valueDanger: {
		color: '#FF6B6B',
	},
});
