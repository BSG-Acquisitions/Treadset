

## Problem

The manifest wizard has a "Payment Method" step (step index 3) where the driver selects CHECK and enters a check number. The UI shows the field as required with a red border and warning text, **but the "Next" button has no validation** for check number on this step. The driver can select CHECK, leave check number blank, and proceed through signatures and review without being blocked.

The `disabled` check for check number only exists on buttons in the final "payment" step (step index 6), which is too late — by then the manifest is already created.

This explains why Gratiot Wheel & Tire (and several other CHECK pickups from today and earlier) have `null` check numbers in the database.

## Fix

**File: `src/components/driver/DriverManifestCreationWizard.tsx`**

Add validation in the `handleNext` function for the `"payment-method"` step (around line 607, after the pricing validation block):

```
if (currentStep.key === "payment-method") {
  if (paymentMethod === 'CHECK' && !checkNumber.trim()) {
    toast({
      title: "Check Number Required",
      description: "Please enter the check number before continuing. This is required for all check payments.",
      variant: "destructive",
    });
    return;
  }
}
```

This is a one-line-block addition that mirrors the existing validation pattern used for tires, pricing, and signatures. It will prevent the driver from advancing past the payment method step without entering a check number when CHECK is selected.

