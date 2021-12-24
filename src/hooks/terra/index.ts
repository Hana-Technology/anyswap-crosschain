import {useState, useEffect, useCallback} from 'react'
import {
  MsgSend,
  Coins,
  // MsgExecuteContract,
  StdFee,
  LCDClient,
  Coin,
  // CreateTxOptions,
} from '@terra-money/terra.js'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import _ from 'lodash'
import currency from './currency'


export enum AssetNativeDenomEnum {
  ukrw = 'ukrw',
  uusd = 'uusd',
  uluna = 'uluna',
  usdr = 'usdr',
  umnt = 'umnt',
}

const terraExt = {
  chainID: "columbus-5",
  fcd: "https://fcd.terra.dev",
  lcd: "https://lcd.terra.dev",
  localterra: false,
  mantle: "https://mantle.terra.dev",
  name: "mainnet",
  walletconnectID: 1
}

const isNativeTerra = (str: string): boolean =>
  str.startsWith('u') &&
  currency.currencies.includes(str.slice(1).toUpperCase())

export function useTerraSend () {

  const [gasPricesFromServer, setGasPricesFromServer] = useState<any>()

  const getGasPricesFromServer = useCallback(
    async (fcd?:any): Promise<void> => {
      if (fcd) {
        const { data } = await axios.get(terraExt.fcd + '/v1/txs/gas_prices', {
          baseURL: fcd,
        })
        // console.log(data)
        setGasPricesFromServer(data)
      }
    }, [])

  useEffect(() => {
    getGasPricesFromServer(terraExt.fcd)
    return (): void => {
      getGasPricesFromServer()
    }
  }, [terraExt.fcd])

  const getTerraSendTax = async (props: {
    denom: AssetNativeDenomEnum
    amount: string
    feeDenom: string
  }): Promise<Coin | undefined> => {
    const { denom, amount, feeDenom: _feeDenom } = props
    if (terraExt && denom && amount) {
      const lcd = new LCDClient({
        chainID: terraExt.chainID,
        URL: terraExt.lcd,
        gasPrices: { [_feeDenom]: gasPricesFromServer[_feeDenom] },
      })
      // tax
      return isNativeTerra(denom)
        ? lcd.utils.calculateTax(new Coin(denom, amount))
        : new Coin(_feeDenom, 0)
    }
    return undefined
  }

  const getTerraFeeList = async (
    address:any,
    toAddress:any,
    Unit:any,
    inputAmount:any
  ): Promise<
    {
      denom: AssetNativeDenomEnum
      fee?: StdFee
      tax?: any
    }[]
  > => {
    if (terraExt && inputAmount && address && toAddress && Unit) {
      let gas = 200000
      const tax = await getTerraSendTax({denom: Unit, amount: inputAmount, feeDenom: Unit})
      try {
        const feeDenoms = [AssetNativeDenomEnum.uluna]

        const msgs = new MsgSend(
          address,
          toAddress,
          { [Unit]: 	inputAmount }
        )
        // console.log(msgs)
        const lcd = new LCDClient({
          chainID: terraExt.chainID,
          URL: terraExt.lcd,
          gasPrices: gasPricesFromServer,
        })
        // fee + tax
        const unsignedTx = await lcd.tx.create(address, {
          msgs: [msgs],
          feeDenoms,
        })
        gas = unsignedTx.fee.gas
      } catch (err) {
        // gas is just default value
        console.log('error')
        console.log(err)
      }

      return _.map(AssetNativeDenomEnum, (denom) => {
        const amount = new BigNumber(gasPricesFromServer[denom])
          .multipliedBy(gas)
          .dp(0, BigNumber.ROUND_UP)
          .toString(10)
        const gasFee = new Coins({ [denom]: amount })
        const fee = new StdFee(gas, gasFee)
        return {
          denom,
          fee,
          tax
        }
      })
    }
    return []
  }
  return {
    getTerraFeeList
  }
}