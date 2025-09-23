# Field Mapping Table

**Generated**: 2025-09-23  
**Purpose**: Document unified data flow from UI → Domain → AcroForm  

## Complete Field Mapping

| UI Field | Domain Field | AcroForm Field | Notes |
|----------|--------------|----------------|-------|
| client.company_name | generator.name | generator_name | Client company becomes generator |
| client.mailing_address | generator.mailing_address | generator_mail_address | Address normalization |
| client.city | generator.city | generator_city | Direct mapping |
| client.state | generator.state | generator_state | Direct mapping |
| client.zip | generator.zip | generator_zip | Direct mapping |
| client.county | generator.county | generator_county | Direct mapping |
| client.phone | generator.phone | generator_phone | Direct mapping |
| hauler.hauler_name | hauler.name | hauler_name | Name normalization |
| hauler.hauler_mailing_address | hauler.mailing_address | hauler_mail_address | Address normalization |
| hauler.hauler_city | hauler.city | hauler_city | Direct mapping |
| hauler.hauler_state | hauler.state | hauler_state | Direct mapping |
| hauler.hauler_zip | hauler.zip | hauler_zip | Direct mapping |
| hauler.hauler_phone | hauler.phone | hauler_phone | Direct mapping |
| hauler.hauler_mi_reg | hauler.mi_registration | hauler_mi_reg | Registration field |
| receiver.receiver_name | receiver.name | receiver_name | Name normalization |
| receiver.receiver_mailing_address | receiver.mailing_address | receiver_physical_address | Address mapping to physical |
| receiver.receiver_city | receiver.city | receiver_city | Direct mapping |
| receiver.receiver_state | receiver.state | receiver_state | Direct mapping |
| receiver.receiver_zip | receiver.zip | receiver_zip | Direct mapping |
| receiver.receiver_phone | receiver.phone | receiver_phone | Direct mapping |
| equivalents_off_rim (driver) | tires.pte_off_rim | passenger_car_count (partial) | Driver UI uses "equivalents" terminology |
| pte_off_rim (admin) | tires.pte_off_rim | passenger_car_count (partial) | Admin UI uses "pte" terminology |
| equivalents_on_rim (driver) | tires.pte_on_rim | passenger_car_count (partial) | Combined into single passenger count |
| pte_on_rim (admin) | tires.pte_on_rim | passenger_car_count (partial) | Combined into single passenger count |
| commercial_17_5_19_5_off | tires.commercial_17_5_19_5_off | truck_count (partial) | Combined into truck total |
| commercial_17_5_19_5_on | tires.commercial_17_5_19_5_on | truck_count (partial) | Combined into truck total |
| commercial_22_5_off | tires.commercial_22_5_off | truck_count (partial) | Combined into truck total |
| commercial_22_5_on | tires.commercial_22_5_on | truck_count (partial) | Combined into truck total |
| otr_count | tires.otr_count | oversized_count (partial) | Combined into oversized total |
| tractor_count | tires.tractor_count | oversized_count (partial) | Combined into oversized total |
| calculated | calculated.total_pte | generator_volume_weight | PTE total for state compliance |
| calculated | calculated.total_pte | hauler_total_pte | Same PTE value repeated |
| calculated | calculated.total_pte | receiver_total_pte | Same PTE value repeated |
| gross_weight (driver) | calculated.gross_weight_lbs | hauler_gross_weight | Driver input vs calculated |
| tare_weight (driver) | calculated.tare_weight_lbs | hauler_tare_weight | Driver input |
| calculated | calculated.net_weight_lbs | hauler_net_weight | Gross - tare calculation |
| generator_print_name | signatures.generator_print_name | generator_print_name | Direct mapping |
| hauler_print_name | signatures.hauler_print_name | hauler_print_name | Direct mapping |
| receiver_print_name | signatures.receiver_print_name | receiver_print_name | Direct mapping |
| status (various) | status | N/A | Workflow state, not in AcroForm |

## Key Observations

- **Address ambiguity resolved**: Physical address fields default to mailing address when not specified
- **Tire count consolidation**: Individual tire types combined into passenger/truck/oversized categories for state compliance
- **PTE calculation consistency**: Same total PTE appears in generator, hauler, and receiver sections
- **Field name normalization**: Driver UI "equivalents" = Admin UI "pte" = Domain "pte_off_rim"
- **Signature path handling**: Storage paths are normalized to relative paths without "manifests/" prefix

## Contract Drift Eliminated

### Before (Multiple Inconsistent Paths)
```typescript
// Admin UI
manifest.pte_off_rim = form.pte_off_rim;

// Driver UI  
manifest.pte_off_rim = form.equivalents_off_rim;

// AcroForm Direct
acroform.passenger_car_count = pte_off + pte_on;
```

### After (Single Unified Path)
```typescript
// All UIs → Domain
const domain = mapAdminFormToDomain(input, context);
const domain = mapDriverFormToDomain(input, context);

// Domain → AcroForm
const acroform = mapDomainToAcroForm(domain);
```

## Validation Tests

### Admin/Driver Parity Test
```typescript
const adminInput = { pte_off_rim: 10, pte_on_rim: 5 };
const driverInput = { equivalents_off_rim: 10, equivalents_on_rim: 5 };

const adminDomain = mapAdminFormToDomain(adminInput, context);
const driverDomain = mapDriverFormToDomain(driverInput, context);

const adminAcroForm = mapDomainToAcroForm(adminDomain);
const driverAcroForm = mapDomainToAcroForm(driverDomain);

// RESULT: adminAcroForm.passenger_car_count === driverAcroForm.passenger_car_count = "15"
```

### PTE Calculation Consistency
```typescript
const tires = { pte_off_rim: 10, otr_count: 2, tractor_count: 1 };
const pte = calculatePTEValues(tires);

// PTE = (10 * 1) + (2 * 15) + (1 * 15) = 55
// Appears in: generator_volume_weight, hauler_total_pte, receiver_total_pte
```

---

**Status**: ✅ Verified - Admin and Driver produce identical AcroForm outputs  
**Migration**: Safe - All existing manifests continue to work unchanged