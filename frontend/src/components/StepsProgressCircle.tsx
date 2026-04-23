import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
	value: number;
	goal: number | null;
	size?: number;
	strokeWidth?: number;
};

export default function StepsProgressCircle({
	value,
	goal,
	size = 100,
	strokeWidth = 8,
}: Props) {
	const safeGoal = goal && goal > 0 ? goal : null;
	const progress = safeGoal ? Math.min(value / safeGoal, 1) : 0;

	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference * (1 - progress);

	return (
		<View style={[styles.container, { width: size, height: size }]}>
			<Svg width={size} height={size} style={styles.svg}>
				<Circle
					stroke='#E5E7EB'
					fill='none'
					cx={size / 2}
					cy={size / 2}
					r={radius}
					strokeWidth={strokeWidth}
				/>

				<Circle
					stroke='#20C07A'
					fill='none'
					cx={size / 2}
					cy={size / 2}
					r={radius}
					strokeWidth={strokeWidth}
					strokeDasharray={`${circumference} ${circumference}`}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap='round'
					rotation='-90'
					origin={`${size / 2}, ${size / 2}`}
				/>
			</Svg>

			<View style={styles.content}>
				<Text style={styles.valueText}>{value > 0 ? value : '—'}</Text>
				<Text style={styles.labelText}>
					{value > 0 ? 'шагов' : 'нет данных'}
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	svg: {
		position: 'absolute',
	},
	content: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	valueText: {
		fontSize: 24,
		fontWeight: '700',
		color: '#1F2937',
	},
	labelText: {
		fontSize: 13,
		color: '#6B7280',
	},
});
