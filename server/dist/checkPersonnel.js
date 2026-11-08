"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
async function main() {
    const emps = await prisma_1.default.employee.findMany({
        where: {
            employeeNo: {
                in: [
                    'E10200', 'E10201', 'E10202', 'E10203', 'E10204', 'E10205', 'E10206', 'E10207', 'E10208', 'E10209',
                    'E10210', 'E10211', 'E10212', 'E10213', 'E10214', 'E10215', 'E10216', 'E10217', 'E10218', 'E10219'
                ]
            }
        }
    });
    console.log('Emps E10200-E10219 found count:', emps.length);
}
main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
