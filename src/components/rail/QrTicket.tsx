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
 * The barrier view.
 *
 * Everything here is computed on device. There is no network call in this
 * component and there must never be one: this screen gets opened in a tunnel,
 * in a dead spot, behind a crowd, with 3% battery. The rotation ring exists so
 * a member of staff can see at a glance that the code is live rather than a
 * screenshot.
 */
export function QrTicket({ ticket, size = 230 }: { ticket: Ticket; size?: number }) {
  const { palette, radius, space } = useTheme();
  const seed = useMemo(() => seedFor(ticket), [ticket]);

  const [payload, setPayload] = useState(ticket.barcodePayload);
  const [remaining, setRemaining] = useState(() => secondsUntilRotation());

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const next = await buildBarcodePayload({
        reference: ticket.reference,
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
  }, [seed, ticket.reference, ticket.keyId, ticket.signature, ticket.barcodeRotationSeconds]);

  const fraction = remaining / ticket.barcodeRotationSeconds;
  const ringSize = 26;
  const circumference = 2 * Math.PI * 10;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          padding: space.xl,
          borderRadius: radius.lg,
          // The QR is always rendered on white: contrast is what a scanner
          // needs, and a "dark mode QR" is a returned passenger at a barrier.
          backgroundColor: '#FFFFFF',
        }}
      >
        <QRCode
          value={payload}
          size={size}
          color="#0B1A22"
          backgroundColor="#FFFFFF"
          ecl="M"
          quietZone={6}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg }}>
        <Svg width={ringSize} height={ringSize} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={10} stroke={palette.hairline} strokeWidth={2.4} fill="none" />
          <Circle
            cx={12}
            cy={12}
            r={10}
            stroke={palette.brand}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            transform="rotate(-90 12 12)"
          />
        </Svg>
        <Text variant="caption" tone="tertiary">
          Code refreshes in {remaining}s · works offline
        </Text>
      </View>
    </View>
  );
}
