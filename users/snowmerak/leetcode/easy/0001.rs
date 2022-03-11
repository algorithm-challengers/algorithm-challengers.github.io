use std::cmp::Ordering;

impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        let mut a = 0;
        let mut b = nums.len() -1;
        let mut args = nums.clone();
        args.sort();
        loop {
            let sum = args[a] + args[b];
            match sum.cmp(&target) {
                Ordering::Less => {
                    a += 1;
                }
                Ordering::Equal => {
                    break;
                }
                Ordering::Greater => {
                    b -= 1;
                }
            }
        }
        vec![nums.iter().position(|&x| x == args[a]).unwrap() as i32, nums.iter().rposition(|&x| x == args[b]).unwrap() as i32]
    }
}