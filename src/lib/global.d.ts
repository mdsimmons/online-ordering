interface Navigator {
  usb?: {
    requestDevice: (options: { filters: { vendorId: number }[] }) => Promise<USBDevice>;
  };
}

interface USBDevice {
  open: () => Promise<void>;
  selectConfiguration: (index: number) => Promise<void>;
  claimInterface: (index: number) => Promise<void>;
  transferOut: (endpoint: number, data: ArrayBuffer | ArrayBufferView) => Promise<USBOutTransferResult>;
  close: () => Promise<void>;
}

interface USBOutTransferResult {
  status: string;
  bytesWritten: number;
}
