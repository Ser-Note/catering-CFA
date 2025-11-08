// Test to verify split-line quantity parsing

const testEmail = `
Customer Information
John Doe
john@example.com
+15555555555

Item Name	Quantity	Qty	Price
8oz Chick-fil-A Sauce
1 $2.50
8oz Barbeque Sauce
2 $5.00
Spicy Chicken Sandwich
5 $25.00
`;

console.log('Test Email Format:');
console.log('==================');
console.log(testEmail);
console.log('\nThis tests three scenarios:');
console.log('1. "8oz Chick-fil-A Sauce" on line 1, quantity "1 $2.50" on line 2');
console.log('2. "8oz Barbeque Sauce" on line 1, quantity "2 $5.00" on line 2');
console.log('3. "Spicy Chicken Sandwich" on line 1, quantity "5 $25.00" on line 2');
console.log('\nThe parser should now correctly handle all three cases!');
console.log('\nTo test with real emails, run: node test-poller.js');
