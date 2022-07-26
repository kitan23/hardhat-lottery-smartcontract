/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  BigNumberish,
  Overrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { Raffle, RaffleInterface } from "../Raffle";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "entranceFee",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "getEntranceFee",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x60a060405234801561001057600080fd5b506040516101953803806101958339818101604052810190610032919061007b565b8060808181525050506100a8565b600080fd5b6000819050919050565b61005881610045565b811461006357600080fd5b50565b6000815190506100758161004f565b92915050565b60006020828403121561009157610090610040565b5b600061009f84828501610066565b91505092915050565b60805160d56100c06000396000604b015260d56000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c806309bc33a714602d575b600080fd5b60336047565b604051603e91906086565b60405180910390f35b60007f0000000000000000000000000000000000000000000000000000000000000000905090565b6000819050919050565b608081606f565b82525050565b6000602082019050609960008301846079565b9291505056fea2646970667358221220162f2af9911cfcc85f7e48694bc78bfa43d9785c73d026f052ed007d627ba02e64736f6c63430008080033";

type RaffleConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: RaffleConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Raffle__factory extends ContractFactory {
  constructor(...args: RaffleConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    entranceFee: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<Raffle> {
    return super.deploy(entranceFee, overrides || {}) as Promise<Raffle>;
  }
  override getDeployTransaction(
    entranceFee: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(entranceFee, overrides || {});
  }
  override attach(address: string): Raffle {
    return super.attach(address) as Raffle;
  }
  override connect(signer: Signer): Raffle__factory {
    return super.connect(signer) as Raffle__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): RaffleInterface {
    return new utils.Interface(_abi) as RaffleInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): Raffle {
    return new Contract(address, _abi, signerOrProvider) as Raffle;
  }
}
