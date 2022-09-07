// import { useEffect, useMemo, useRef } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { formatUnits } from '@ethersproject/units'
import { useActiveWeb3React } from '../../hooks'
import { useActiveReact } from '../../hooks/useActiveReact'
import useInterval from '../../hooks/useInterval'
import { AppDispatch } from '../index'
import { tokenBalanceList } from './actions'
// import {useTokenBalances} from './hooks'

import { useAllMergeBridgeTokenList } from '../lists/hooks'
import {useAllTransactions, isTransactionRecent} from '../transactions/hooks'
import { TransactionDetails } from '../transactions/reducer'

import ERC20_INTERFACE from '../../constants/abis/erc20'

import {useRpcState} from '../rpc/hooks'

import {getWeb3} from '../../utils/tools/multicall'
import {useBatchData} from '../../utils/tools/useBatchData'
import { isAddress } from '../../utils/isAddress/index'

// import config from '../../config'
// import { fromWei } from '../../utils/tools/tools'
// const startTime = Date.now()
const limit = 80

// function getAllBalance () {
//   return new Promise(resolve => {

//   })
// }

function newTransactionsFirst(a: TransactionDetails, b: TransactionDetails) {
  return b.addedTime - a.addedTime
}

export default function Updater(): null {
  const { chainId, account } = useActiveReact()
  const { library } = useActiveWeb3React()
  const dispatch = useDispatch<AppDispatch>()
  // const lists = useSelector<AppState, AppState['lists']['byUrl']>(state => state.lists.byUrl)
  const allTokens = useAllMergeBridgeTokenList('mergeTokenList', chainId)
  const rpcItem = useRpcState()
  const tokenListRef = useRef<any>(0)

  const allTransactions = useAllTransactions()
  // console.log(library)
  const sortedRecentTransactions = useMemo(() => {
    const txs = Object.values(allTransactions)
    return txs.filter(isTransactionRecent).sort(newTransactionsFirst)
  }, [allTransactions])

  const pending = sortedRecentTransactions.filter(tx => !tx.receipt).map(tx => tx.hash)
  const pendingLength = pending.length
  
  const calls = useMemo(() => {
    const arr = []
    const list = allTokens ? Object.values(allTokens ?? {}) : []
    // console.log(list)
    if (account && !isNaN(chainId)) {
      // for (const obj of list) {
      for (let i = 0, len = list.length; i < len; i++) {
        const obj:any = list[i]
        const token:any = obj.address
        if (isAddress(obj.address)) {
          arr.push({
            dec: obj.decimals,
            target: token,
            callData: ERC20_INTERFACE.encodeFunctionData('balanceOf', [account]),
          })
        }
      }
    }
    // console.log(arr)
    return arr
  }, [allTokens, account, chainId])
  const getBalance = useCallback((arr) => {
    return new Promise(resolve => {
      if (
        !chainId
        || isNaN(chainId)
        || arr.length <= 0
      ) {
        resolve('')
        return
      }
      const provider = rpcItem && rpcItem.origin === 'wallet' && library ? library?.provider : ''
      useBatchData({
        chainId, 
        calls: arr.map(({callData, target}: {callData:string, target:string}) => ({type: 'TOKEN', callData, target})), 
        provider
      }).then((res) => {
        // console.log(res)
        if (res) {
          const blList:any = {}
          for (let i = 0, len = arr.length; i < len; i++) {
            const token = arr[i].target.toLowerCase()
            const dec = arr[i].dec
            const results = res[i]
            let bl = ''
            try {
              bl = results === '0x' ? '0' : ERC20_INTERFACE.decodeFunctionResult('balanceOf', results)[0].toString()
            } catch (error) {
              // console.error(error)
            }
            blList[token] = {
              // balance: fromWei(results, dec),
              balance: bl ? formatUnits(bl, dec) : '',
              balancestr: bl,
              dec: dec,
              // blocknumber: res.blockNumber
            }
          }
          dispatch(tokenBalanceList({
            chainId,
            account,
            tokenList: blList
          }))
        }
        resolve(res)
      })
    })
  }, [rpcItem, chainId])

  const getETHBalance = useCallback(() => {
    return new Promise(resolve => {
      if (account) {
        if (
          !chainId
          || isNaN(chainId)
          // || !config.getCurChainInfo(chainId)?.multicalToken
        ) {
          resolve('')
          return
        }
        const provider = library ? library?.provider : ''
        const web3 = getWeb3('', provider)
        web3.eth.getBalance(account).then((res:any) => {
          // console.log(res)
          const blList:any = {}
          const dec = 18
          blList['NATIVE'] = {
            balance: formatUnits(res, dec),
            balancestr: res,
            dec: dec,
            blocknumber: ''
          }
          dispatch(tokenBalanceList({
            chainId,
            account,
            tokenList: blList
          }))
          resolve(res)
        })
      } else {
        resolve('')
      }
    })
  }, [rpcItem, chainId, account])

  const getAllBalance = useCallback(() => {
    const results = []
    if (calls.length > limit) {
      for (let i = 0, len = calls.length; i < len; i += limit) {
        results.push(calls.slice(i, i + limit))
      }
    } else {
      results.push(calls)
    }
    // console.log(calls)
    // console.log(results)
    const arr = [getETHBalance()]
    for (const item of results) {
      arr.push(getBalance(item))
    }
    const st = Date.now()
    Promise.all(arr).then(res => {
      console.log(Date.now() - st)
      console.log(res)
    })
  }, [calls])

  useEffect(() => {
    if (
      library
      && chainId
      && !isNaN(chainId)
      && account
      && calls.length > 0
      && !tokenListRef.current
    ) {
      tokenListRef.current = 1
      console.log(chainId)
      getAllBalance()
    }
  }, [library, calls, chainId, account, rpcItem])

  useEffect(() => {
    if (account) tokenListRef.current = 0
  }, [account])

  // console.log(pending)
  // console.log(pendingLength)
  useEffect(() => {
    // console.log('pendingLength')
    if (
      chainId
      && !isNaN(chainId)
      && account
      && calls.length > 0
    ) {
      getAllBalance()
    }
  }, [pendingLength])

  useInterval(getAllBalance, 1000 * 60 * 10, false)

  return null
}
