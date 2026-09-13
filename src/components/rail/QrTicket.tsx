import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';

import { Ticket } from '@/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/primitives/Text';
import { buildBarcodePayload, secondsUntilRotation } from '@/services/barcode';
import { seedFor } from '@/services/ticketIssuer';

/**
 * The gate view.
 *
 * Everything here is computed on device. There is no network call in this
 * component and there must never be one: this screen gets opened on a crowded
 * platform, in a tunnel, at four in the morning, with 3% battery.
 *
 * The rotation ring exists so a conductor can see at a glance that the code is
 * live rather than a screenshot someone was sent on WhatsApp.
 */
export function QrTicket({ ticket, size = 220 }: { ticket: Ticket; size?: number }) {
  const { palette, radius, space } = useTheme();
  const seed = useMemo(() => seedFor(ticket), [ticket]);

  const [payload, setPayload] = useState(ticket.barcodePayload);
  const [remaining, setRemaining] = useState(() => secondsUntilRotation());

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const next = await buildBarcodePayload({
        reference: ticket.pnr,
        keyId: ticket.keyId,
        signature: ticket.signature,
        seed,
      });
      if (!cancelled) setPayload(next);
    };

    void refresh();
    const timer = setInterval(() => {
      const left = secondsUntilRotation();
      setRemaining(left);
      if (left === ticket.barcodeRotationSeconds) void refresh();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [seed, ticket.pnr, ticket.keyId, ticket.signature, ticket.barcodeRotationSeconds]);

  const fraction = remaining / ticket.barcodeRotationSeconds;
  const circumference = 2 * Math.PI * 10;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          padding: space.base,
          borderRadius: radius.md,
          // Always white, in both themes. Contrast is what a scanner needs, and
          // a "dark mode QR" is a passenger turned away at the gate.
          backgroundColor: '#FFFFFF',
        }}
      >
        <QRCode value={payload} size={size} color="#111111" backgroundColor="#FFFFFF" ecl="M" quietZone={6} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} stroke={palette.border} strokeWidth={2.6} fill="none" />
          <Circle
            cx={12}
            cy={12}
            r={10}
            stroke={palette.brand}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            transform="rotate(-90 12 12)"
          />
        </Svg>
        <Text variant="caption" tone="secondary">
          Refreshes in {remaining}s · works with no signal
        </Text>
      </View>
    </View>
  );
}
