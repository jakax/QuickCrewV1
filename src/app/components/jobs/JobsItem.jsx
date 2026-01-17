import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import StyledText from '../../../styles/styledText';
import theme from '../../../theme';
import { useNavigation } from '@react-navigation/native';

const JobsItem = (props) => {
  const navigation = useNavigation();
  return (
    <Pressable 
      onPress={() => navigation.navigate("JobDetails", { props })}
      style={styles.container}>
            <StyledText fontSize='heading' fontWeight='bold'>{props.companyName}</StyledText>
            <StyledText fontSize='subheading'>{props.jobName}</StyledText>
            <StyledText color>{props.salary}</StyledText>
            <StyledText>{props.jobLocation}</StyledText>
            <StyledText>{props.jobDescription}</StyledText>
            <StyledText style={styles.jobType}>{props.jobType}</StyledText>
            <StyledText>Posted: {props.postedDate.toDate().toLocaleDateString()}</StyledText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  jobType: {
    padding: 4,
    color: theme.colors.white,
    backgroundColor: theme.colors.tag,
    alignSelf: 'flex-start',
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default JobsItem;