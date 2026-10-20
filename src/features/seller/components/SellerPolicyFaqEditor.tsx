import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/ui/AppButton';
import { AppInput } from '../../../components/ui/AppInput';
import { AppText } from '../../../components/ui/AppText';
import { colors, spacing } from '../../../design-system';
import type { SellerPolicyFaqEntry } from '../utils/sellerSetupForms';

export interface SellerPolicyFaqEditorProps {
  faqList: SellerPolicyFaqEntry[];
  draftQuestion: string;
  draftAnswer: string;
  onDraftQuestionChange: (value: string) => void;
  onDraftAnswerChange: (value: string) => void;
  onDraftFieldFocus?: () => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string | null;
  tone?: 'default' | 'surface';
}

export function SellerPolicyFaqEditor({
  faqList,
  draftQuestion,
  draftAnswer,
  onDraftQuestionChange,
  onDraftAnswerChange,
  onDraftFieldFocus,
  onAdd,
  onRemove,
  error,
  tone = 'default',
}: SellerPolicyFaqEditorProps) {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <AppText variant="bodyMedium" style={styles.title}>
        FAQs
      </AppText>
      <AppText variant="caption" color="textSecondary">
        Optional shop FAQs shown on your store policies.
      </AppText>

      <AppInput
        tone={tone}
        label="Question"
        value={draftQuestion}
        onChangeText={onDraftQuestionChange}
        onFocus={onDraftFieldFocus}
        placeholder="Enter a question"
      />
      <AppInput
        tone={tone}
        label="Answer"
        value={draftAnswer}
        onChangeText={onDraftAnswerChange}
        onFocus={onDraftFieldFocus}
        placeholder="Enter an answer"
        multiline
        numberOfLines={3}
      />

      <AppButton label="Add FAQ" variant="primary" onPress={onAdd} />

      {error ? (
        <AppText variant="caption" color="error">
          {error}
        </AppText>
      ) : null}

      {faqList.length > 0 ? (
        <View style={styles.list}>
          {faqList.map((faq, index) => {
            const expanded = expandedFaqIndex === index;

            return (
              <View key={`${faq.question}-${index}`} style={styles.item}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedFaqIndex(expanded ? null : index)}
                  style={styles.faqHeader}
                >
                  <AppText variant="bodyMedium" style={styles.question}>
                    {expanded ? '▾ ' : '▸ '}
                    {faq.question}
                  </AppText>
                </Pressable>
                {expanded ? (
                  <AppText variant="bodySmall" color="textSecondary" style={styles.faqAnswer}>
                    {faq.answer}
                  </AppText>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => onRemove(index)} style={styles.removeButton}>
                  <AppText variant="bodySmall" color="error">
                    Remove
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  faqHeader: {
    paddingVertical: spacing.xs,
  },
  question: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  faqAnswer: {
    lineHeight: 20,
    paddingLeft: spacing.md,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
});
