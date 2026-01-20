import bcrypt from "bcrypt";

const hash = await bcrypt.hash("hatemenow", 10);
console.log(hash);

const compare = await bcrypt.compare("hatemenow", hash);
console.log(compare);
