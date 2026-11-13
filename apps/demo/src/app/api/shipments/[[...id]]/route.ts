import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '../../../../server/api-db/db';

// Keep list/detail/update in one route so serverless deployments do not split
// the demo's process-local store between separate endpoint functions.
const PositionSchema = z.tuple([z.number(), z.number()]);
const ShipmentStateSchema = z.enum(['inTransit', 'delayed', 'delivered']);
const QuerySchema = z.object({ state: ShipmentStateSchema.optional() });
const AddressSchema = z.object({
  city: z.string(),
  country: z.string(),
  addressLine: z.string(),
  position: PositionSchema,
});
const UpdateSchema = z
  .object({
    state: z.array(ShipmentStateSchema).optional(),
    carrier: z.string().optional(),
    origin: AddressSchema.optional(),
    destination: AddressSchema.optional(),
    estimatedDeliveryDate: z.string().optional(),
    originalEstimatedDeliveryDate: z.string().optional(),
    finalDeliveryDate: z.string().optional(),
    delayReason: z.string().optional(),
    actualPosition: PositionSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

type RouteContext = { params: Promise<{ id?: string[] }> };

/** List the fixed demo seed or retrieve one shipment. */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id = [] } = await params;
  if (id.length > 1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [shipmentId] = id;
  if (shipmentId) {
    const shipment = db.shipments.getById(shipmentId);
    return shipment
      ? NextResponse.json(shipment)
      : NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const states = request.nextUrl.searchParams.getAll('state');
  const query = QuerySchema.safeParse({
    state: states.length > 1 ? states : states[0],
  });
  if (!query.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: query.error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json(db.shipments.getAll(query.data.state));
}

/** Apply validated edits to one shipment in the demo's in-memory store. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id = [] } = await params;
  const [shipmentId] = id;
  if (id.length !== 1 || !shipmentId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid shipment update payload',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const updated = db.shipments.update(shipmentId, parsed.data);
  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
}
