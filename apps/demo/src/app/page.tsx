import { App } from '../app';
import { DemoShipmentsProvider } from '../domain/demo-shipments';

export default function Page() {
  return (
    <DemoShipmentsProvider>
      <App />
    </DemoShipmentsProvider>
  );
}
