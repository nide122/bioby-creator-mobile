import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutRectangle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';

import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  DELIVERABLE_CUSTOM,
  DELIVERABLE_TYPE_IDS,
  formatPriceAmount,
  formatPriceRangeFromState,
  defaultPrepayState,
  formatPrepayLabel,
  isPriceRangeValid,
  parseDeliverables,
  parsePrepayLabel,
  parsePriceLabel,
  parseRevisionRounds,
  parseUsageRights,
  PREPAY_PRESET_IDS,
  PRICE_AMOUNTS,
  PRICE_CUSTOM,
  QUANTITY_OPTIONS,
  REVISION_TYPE_IDS,
  resolvePriceBound,
  serializeDeliverables,
  serializeRevisionRounds,
  serializeUsageRights,
  USAGE_PRESET_IDS,
  USAGE_CUSTOM,
  createEmptyDeliverableRow,
  createEmptyRevisionRow,
  deliverableTypeLabel,
  revisionTypeLabel,
  usagePresetLabel,
  type DeliverableRow,
  type PrepayState,
  type PriceBoundState,
  type PriceRangeState,
  type RevisionRow,
  type UsageRightsState,
} from '@/src/lib/rate-card-package-form';
import type { RateCardPackage } from '@/src/types/domain';

type Theme = (typeof palette)['light'];

function FieldLabel({ label, hint, theme }: { label: string; hint?: string; theme: Theme }) {
  return (
    <View style={styles.labelBlock}>
      <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>{label}</Text>
      {hint ? <Text style={[styles.labelHint, { color: theme.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

function OptionDropdown<T extends string>({
  value,
  options,
  placeholder,
  theme,
  onChange,
  customOptionId,
  customValue,
  onCustomValueChange,
  customPlaceholder,
  prefix,
  suffix,
  keyboardType,
}: {
  value: T | '';
  options: { id: T; label: string }[];
  placeholder: string;
  theme: Theme;
  onChange: (id: T) => void;
  customOptionId?: T;
  customValue?: string;
  onCustomValueChange?: (value: string) => void;
  customPlaceholder?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<LayoutRectangle | null>(null);
  const triggerRef = useRef<View>(null);
  const customInputRef = useRef<TextInput>(null);
  const isCustom = customOptionId != null && value === customOptionId;
  const selected = options.find((option) => option.id === value);
  const display =
    isCustom && customValue?.trim()
      ? `${prefix ?? ''}${customValue.trim()}${suffix ?? ''}`
      : selected?.label ?? placeholder;

  const closeMenu = () => {
    setOpen(false);
    setMenuRect(null);
  };

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuRect({ x, y: y + height + 4, width, height: 0 });
      setOpen(true);
    });
  };

  const toggleMenu = () => {
    if (open) closeMenu();
    else openMenu();
  };

  const selectOption = (optionId: T) => {
    onChange(optionId);
    closeMenu();
    if (customOptionId != null && optionId === customOptionId) {
      requestAnimationFrame(() => customInputRef.current?.focus());
    }
  };

  const customInputStyle = useMemo(
    () => [
      styles.inlineCustomInput,
      {
        color: theme.foreground,
        backgroundColor: theme.card,
      },
      Platform.OS === 'web'
        ? ({
            outlineStyle: 'none',
            outlineWidth: 0,
            boxShadow: 'none',
          } as const)
        : null,
    ],
    [theme.card, theme.foreground],
  );

  return (
    <View style={styles.dropdownWrap}>
      <View
        ref={triggerRef}
        style={[styles.dropdownTrigger, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.dropdownTriggerBody}>
          {isCustom && onCustomValueChange ? (
            <Pressable
              accessibilityRole="none"
              onPress={() => customInputRef.current?.focus()}
              style={styles.dropdownTriggerPressable}>
              <View style={styles.inlineCustomRow} pointerEvents="box-none">
                {prefix ? (
                  <Text style={[styles.inputPrefix, styles.inputAffix, { color: theme.foregroundSubtitle }]}>
                    {prefix}
                  </Text>
                ) : null}
                <TextInput
                  ref={customInputRef}
                  value={customValue ?? ''}
                  onChangeText={onCustomValueChange}
                  placeholder={customPlaceholder ?? placeholder}
                  keyboardType={keyboardType ?? (prefix === '$' ? 'number-pad' : 'default')}
                  onFocus={() => {
                    if (customOptionId && value !== customOptionId) onChange(customOptionId);
                    closeMenu();
                  }}
                  placeholderTextColor={theme.mutedForeground}
                  cursorColor={theme.primary}
                  selectionColor={`${theme.primary}55`}
                  underlineColorAndroid="transparent"
                  numberOfLines={1}
                  style={customInputStyle}
                />
                {suffix ? (
                  <Text style={[styles.inputPrefix, styles.inputAffix, { color: theme.foregroundSubtitle }]}>
                    {suffix}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={toggleMenu} style={styles.dropdownTriggerPressable}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.dropdownValue, { color: selected ? theme.foreground : theme.mutedForeground }]}>
                {display}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={placeholder}
          onPress={toggleMenu}
          hitSlop={8}
          style={styles.dropdownChevron}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.foregroundEyebrow} />
        </Pressable>
      </View>
      {open && menuRect ? (
        <Modal visible transparent animationType="none" onRequestClose={closeMenu}>
          <Pressable accessibilityRole="button" style={styles.dropdownBackdrop} onPress={closeMenu} />
          <View
            style={[
              styles.dropdownMenu,
              styles.dropdownMenuFloating,
              {
                top: menuRect.y,
                left: menuRect.x,
                width: menuRect.width,
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
              {options.map((option) => {
                const active = value === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => selectOption(option.id)}
                    style={[styles.dropdownItem, active && { backgroundColor: `${theme.primary}12` }]}>
                    <Text style={[styles.dropdownItemLabel, { color: active ? theme.primary : theme.foreground }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function PriceRangePicker({
  value,
  onChange,
  theme,
  t,
}: {
  value: PriceRangeState;
  onChange: (next: PriceRangeState) => void;
  theme: Theme;
  t: TFunction;
}) {
  const amountOptions = useMemo(
    () => [
      ...PRICE_AMOUNTS.map((id) => ({ id: id as typeof PRICE_CUSTOM | (typeof PRICE_AMOUNTS)[number], label: formatPriceAmount(id) })),
      { id: PRICE_CUSTOM, label: t('pricingEditScreen.priceCustomOption') },
    ],
    [t]
  );

  const updateBound = (side: 'min' | 'max', patch: Partial<PriceBoundState>) => {
    onChange({ ...value, [side]: { ...value[side], ...patch } });
  };

  return (
    <View style={styles.block}>
      <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrice')} />
      <View style={styles.priceRow}>
        <View style={styles.priceCol}>
          <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>{t('pricingEditScreen.labelPriceMin')}</Text>
          <OptionDropdown
            value={value.min.preset}
            options={amountOptions}
            placeholder={t('pricingEditScreen.priceSelectPlaceholder')}
            theme={theme}
            customOptionId={PRICE_CUSTOM}
            customValue={value.min.customAmount}
            onCustomValueChange={(customAmount) => updateBound('min', { customAmount })}
            customPlaceholder={t('pricingEditScreen.priceCustomPlaceholderShort')}
            prefix="$"
            onChange={(preset) => updateBound('min', { preset })}
          />
        </View>
        <Text style={[styles.priceDash, { color: theme.mutedForeground }]}>—</Text>
        <View style={styles.priceCol}>
          <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>{t('pricingEditScreen.labelPriceMax')}</Text>
          <OptionDropdown
            value={value.max.preset}
            options={amountOptions}
            placeholder={t('pricingEditScreen.priceSelectPlaceholder')}
            theme={theme}
            customOptionId={PRICE_CUSTOM}
            customValue={value.max.customAmount}
            onCustomValueChange={(customAmount) => updateBound('max', { customAmount })}
            customPlaceholder={t('pricingEditScreen.priceCustomPlaceholderShort')}
            prefix="$"
            onChange={(preset) => updateBound('max', { preset })}
          />
        </View>
      </View>
      {!isPriceRangeValid(value) && value.min.preset && value.max.preset ? (
        <Text style={[styles.hintError, { color: '#B45309' }]}>{t('pricingEditScreen.priceRangeInvalid')}</Text>
      ) : isPriceRangeValid(value) ? (
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>{formatPriceRangeFromState(value)}</Text>
      ) : null}
    </View>
  );
}

function QuantityDropdown({
  value,
  onChange,
  theme,
  t,
  unit = 'item',
}: {
  value: DeliverableRow['quantity'];
  onChange: (value: DeliverableRow['quantity']) => void;
  theme: Theme;
  t: TFunction;
  unit?: 'item' | 'round';
}) {
  const labelKey = unit === 'round' ? 'pricingEditScreen.revisionQuantityOption' : 'pricingEditScreen.quantityOption';
  const options = QUANTITY_OPTIONS.map((id) => ({ id, label: t(labelKey, { count: id }) }));
  return (
    <OptionDropdown
      value={value}
      options={options}
      placeholder={t('pricingEditScreen.quantityPlaceholder')}
      theme={theme}
      onChange={onChange}
    />
  );
}

function DeliverableRowsEditor({
  rows,
  onChange,
  theme,
  t,
}: {
  rows: DeliverableRow[];
  onChange: (rows: DeliverableRow[]) => void;
  theme: Theme;
  t: TFunction;
}) {
  const typeOptions = useMemo(
    () => [
      ...DELIVERABLE_TYPE_IDS.map((id) => ({ id, label: deliverableTypeLabel(id, t) })),
      { id: DELIVERABLE_CUSTOM, label: t('pricingEditScreen.deliverableCustomOption') },
    ],
    [t]
  );

  const updateRow = (index: number, patch: Partial<DeliverableRow>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  return (
    <View style={styles.block}>
      <FieldLabel theme={theme} label={t('pricingEditScreen.labelDeliverables')} />
      <View style={styles.rowStack}>
        {rows.map((row, index) => (
          <View key={`del-${index}`} style={[styles.cascadeCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.cascadeHeader}>
              <Text style={[styles.cascadeTitle, { color: theme.foreground }]}>
                {t('pricingEditScreen.deliverableRowTitle', { index: index + 1 })}
              </Text>
              {rows.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('pricingEditScreen.removeRowA11y')}
                  onPress={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                  hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={theme.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>
              {t('pricingEditScreen.labelDeliverableType')}
            </Text>
            <OptionDropdown
              value={row.type}
              options={typeOptions}
              placeholder={t('pricingEditScreen.deliverableTypePlaceholder')}
              theme={theme}
              customOptionId={DELIVERABLE_CUSTOM}
              customValue={row.customType}
              onCustomValueChange={(customType) => updateRow(index, { customType })}
              customPlaceholder={t('pricingEditScreen.deliverableCustomPlaceholder')}
              onChange={(type) => updateRow(index, { type: type as DeliverableRow['type'] })}
            />
            {row.type ? (
              <>
                <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>
                  {t('pricingEditScreen.labelDeliverableQty')}
                </Text>
                <QuantityDropdown
                  value={row.quantity}
                  onChange={(quantity) => updateRow(index, { quantity })}
                  theme={theme}
                  t={t}
                />
              </>
            ) : null}
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...rows, createEmptyDeliverableRow()])}
        style={[styles.addRowButton, { borderColor: theme.border }]}>
        <Ionicons name="add" size={16} color={theme.primary} />
        <Text style={[styles.addRowLabel, { color: theme.primary }]}>{t('pricingEditScreen.addDeliverableRow')}</Text>
      </Pressable>
    </View>
  );
}

function RevisionRowsEditor({
  rows,
  onChange,
  theme,
  t,
}: {
  rows: RevisionRow[];
  onChange: (rows: RevisionRow[]) => void;
  theme: Theme;
  t: TFunction;
}) {
  const typeOptions = REVISION_TYPE_IDS.map((id) => ({ id, label: revisionTypeLabel(id, t) }));

  const updateRow = (index: number, patch: Partial<RevisionRow>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  return (
    <View style={styles.block}>
      <FieldLabel theme={theme} label={t('pricingEditScreen.labelRevisionRounds')} />
      <View style={styles.rowStack}>
        {rows.map((row, index) => (
          <View key={`rev-${index}`} style={[styles.cascadeCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
            <View style={styles.cascadeHeader}>
              <Text style={[styles.cascadeTitle, { color: theme.foreground }]}>
                {t('pricingEditScreen.revisionRowTitle', { index: index + 1 })}
              </Text>
              {rows.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('pricingEditScreen.removeRowA11y')}
                  onPress={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
                  hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={theme.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>
              {t('pricingEditScreen.labelRevisionType')}
            </Text>
            <OptionDropdown
              value={row.type}
              options={typeOptions}
              placeholder={t('pricingEditScreen.revisionTypePlaceholder')}
              theme={theme}
              onChange={(type) => updateRow(index, { type: type as RevisionRow['type'] })}
            />
            {row.type ? (
              <>
                <Text style={[styles.subLabel, { color: theme.foregroundSubtitle }]}>
                  {t('pricingEditScreen.labelRevisionQty')}
                </Text>
                <QuantityDropdown
                  value={row.quantity}
                  onChange={(quantity) => updateRow(index, { quantity })}
                  theme={theme}
                  t={t}
                  unit="round"
                />
              </>
            ) : null}
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...rows, createEmptyRevisionRow()])}
        style={[styles.addRowButton, { borderColor: theme.border }]}>
        <Ionicons name="add" size={16} color={theme.primary} />
        <Text style={[styles.addRowLabel, { color: theme.primary }]}>{t('pricingEditScreen.addRevisionRow')}</Text>
      </Pressable>
    </View>
  );
}

function UsageRightsEditor({
  value,
  onChange,
  theme,
  t,
}: {
  value: UsageRightsState;
  onChange: (next: UsageRightsState) => void;
  theme: Theme;
  t: TFunction;
}) {
  const presetOptions = USAGE_PRESET_IDS.map((id) => ({ id, label: usagePresetLabel(id, t) }));

  return (
    <View style={styles.block}>
      <FieldLabel
        theme={theme}
        label={t('pricingEditScreen.labelUsageRights')}
        hint={t('pricingEditScreen.usageRightsHint')}
      />
      <OptionDropdown
        value={value.preset}
        options={presetOptions}
        placeholder={t('pricingEditScreen.usagePresetPlaceholder')}
        theme={theme}
        customOptionId={USAGE_CUSTOM}
        customValue={value.custom}
        onCustomValueChange={(custom) => onChange({ ...value, preset: USAGE_CUSTOM, custom })}
        customPlaceholder={t('pricingEditScreen.usageCustomPlaceholder')}
        onChange={(preset) =>
          onChange({
            preset: preset as UsageRightsState['preset'],
            custom: preset === USAGE_CUSTOM ? value.custom : '',
          })
        }
      />
    </View>
  );
}

function PrepayEditor({
  value,
  onChange,
  theme,
  t,
}: {
  value: PrepayState;
  onChange: (next: PrepayState) => void;
  theme: Theme;
  t: TFunction;
}) {
  const presetOptions = PREPAY_PRESET_IDS.map((id) => ({
    id,
    label:
      id === 'none'
        ? t('pricingEditScreen.prepayNone')
        : id === 'custom'
          ? t('pricingEditScreen.prepayPresetCustom')
          : t('pricingEditScreen.prepayPercent', { percent: id }),
  }));

  return (
    <View style={styles.block}>
      <FieldLabel theme={theme} label={t('pricingEditScreen.labelPrepay')} />
      <OptionDropdown
        value={value.preset}
        options={presetOptions}
        placeholder={t('pricingEditScreen.prepaySelectPlaceholder')}
        theme={theme}
        customOptionId="custom"
        customValue={value.customPercent}
        onCustomValueChange={(customPercent) => onChange({ ...value, preset: 'custom', customPercent })}
        customPlaceholder={t('pricingEditScreen.placeholderPrepayCustom')}
        suffix="%"
        keyboardType="number-pad"
        onChange={(preset) =>
          onChange({
            preset: preset as PrepayState['preset'],
            customPercent: preset === 'custom' ? value.customPercent : '',
          })
        }
      />
    </View>
  );
}

export function parsePackageStructuredFields(pkg: RateCardPackage, t: TFunction) {
  const parsedDeliverables = parseDeliverables(pkg.deliverables, t);
  const parsedRevisions = parseRevisionRounds(pkg.revisionRounds, t);

  return {
    priceRange: parsePriceLabel(pkg.priceLabel),
    deliverableRows: parsedDeliverables.length > 0 ? parsedDeliverables : [createEmptyDeliverableRow()],
    revisionRows: parsedRevisions.length > 0 ? parsedRevisions : [createEmptyRevisionRow()],
    usageRights: parseUsageRights(pkg.usageRights, t),
    prepay: parsePrepayLabel(pkg.prepayLabel, t),
  };
}

export function isPackageFormValid(pkg: RateCardPackage, _t?: TFunction): boolean {
  if (!pkg.name.trim()) return false;
  const priceLabel = pkg.priceLabel.trim();
  if (!priceLabel) return false;

  const range = parsePriceLabel(priceLabel);
  const min = resolvePriceBound(range.min);
  const max = resolvePriceBound(range.max);
  if (min != null && max != null) {
    return min <= max;
  }

  // Legacy / open-ended labels (e.g. "$5k+", "+$900+") from seed data or free text.
  return true;
}

type Props = {
  pkg: RateCardPackage;
  theme: Theme;
  t: TFunction;
  onUpdate: (patch: Partial<RateCardPackage>) => void;
};

export function RateCardPackageStructuredFields({ pkg, theme, t, onUpdate }: Props) {
  const initial = parsePackageStructuredFields(pkg, t);
  const [priceRange, setPriceRange] = useState(initial.priceRange);
  const [deliverableRows, setDeliverableRows] = useState(initial.deliverableRows);
  const [revisionRows, setRevisionRows] = useState(initial.revisionRows);
  const [usageRights, setUsageRights] = useState(initial.usageRights);
  const [prepay, setPrepay] = useState(initial.prepay);

  useEffect(() => {
    const next = parsePackageStructuredFields(pkg, t);
    setPriceRange(next.priceRange);
    setDeliverableRows(next.deliverableRows);
    setRevisionRows(next.revisionRows);
    setUsageRights(next.usageRights);
    setPrepay(next.prepay);

    if (!pkg.prepayLabel.trim()) {
      const defaultPrepay = defaultPrepayState();
      onUpdate({ prepayLabel: formatPrepayLabel(defaultPrepay, t) });
    }
  }, [pkg.id, pkg.prepayLabel, t]);

  return (
    <>
      <PriceRangePicker
        value={priceRange}
        onChange={(next) => {
          setPriceRange(next);
          onUpdate({ priceLabel: formatPriceRangeFromState(next) });
        }}
        theme={theme}
        t={t}
      />
      <DeliverableRowsEditor
        rows={deliverableRows}
        onChange={(rows) => {
          setDeliverableRows(rows);
          onUpdate({ deliverables: serializeDeliverables(rows, t) });
        }}
        theme={theme}
        t={t}
      />
      <RevisionRowsEditor
        rows={revisionRows}
        onChange={(rows) => {
          setRevisionRows(rows);
          onUpdate({ revisionRounds: serializeRevisionRounds(rows, t) });
        }}
        theme={theme}
        t={t}
      />
      <UsageRightsEditor
        value={usageRights}
        onChange={(next) => {
          setUsageRights(next);
          onUpdate({ usageRights: serializeUsageRights(next, t) });
        }}
        theme={theme}
        t={t}
      />
      <PrepayEditor
        value={prepay}
        onChange={(next) => {
          setPrepay(next);
          onUpdate({ prepayLabel: formatPrepayLabel(next, t) });
        }}
        theme={theme}
        t={t}
      />
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  labelBlock: { gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.xs },
  label: { fontSize: fontSize.caption, fontWeight: '600' },
  labelHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  subLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  hint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  hintError: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  dropdownWrap: { gap: spacing.sm, zIndex: 1, minWidth: 0, flex: 1 },
  dropdownTrigger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    height: layout.touchMin,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  dropdownTriggerBody: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdownTriggerPressable: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdownChevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCustomRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%',
    overflow: 'hidden',
  },
  inlineCustomInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: fontSize.bodySmall + 4,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : { paddingVertical: 0 }),
  },
  dropdownBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  dropdownValue: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: fontSize.bodySmall + 4,
    flexShrink: 1,
  },
  dropdownMenu: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    maxHeight: 220,
    overflow: 'hidden',
  },
  dropdownMenuFloating: { position: 'absolute', zIndex: 2, elevation: 8 },
  dropdownScroll: { maxHeight: 220 },
  dropdownItem: {
    minHeight: layout.touchMin - 6,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  dropdownItemLabel: { fontSize: fontSize.bodySmall, fontWeight: '600' },
  inputPrefix: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  inputAffix: { flexShrink: 0 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  priceCol: { flex: 1, minWidth: 0, gap: spacing.xs },
  priceDash: { fontSize: fontSize.bodySmall, fontWeight: '700', marginTop: 34, flexShrink: 0 },
  rowStack: { gap: spacing.sm },
  cascadeCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cascadeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cascadeTitle: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin - 8,
  },
  addRowLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
});
