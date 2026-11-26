import { useCallback, useRef } from 'react';
import { useDemoShipments } from '../../domain/demo-shipments-context';

export function useShipmentSelection(
  shipmentId: string | null,
  onSelect: (shipmentId: string) => void
) {
  const { shipments } = useDemoShipments();
  const shipment = shipments.find(({ id }) => id === shipmentId);
  const shouldFocusHeading = useRef(false);

  const headingRef = useCallback((heading: HTMLHeadingElement | null) => {
    if (heading && shouldFocusHeading.current) {
      shouldFocusHeading.current = false;
      heading.focus();
    }
  }, []);

  function chooseShipment(shipmentId: string) {
    shouldFocusHeading.current = true;
    onSelect(shipmentId);
  }

  return { shipment, chooseShipment, headingRef };
}
