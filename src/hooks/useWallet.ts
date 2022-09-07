
import { useCallback } from 'react'
import { useWallet, ConnectType } from '@terra-money/wallet-provider'
// import { useDispatch } from 'react-redux'
// import { setOpenModal, ApplicationModal } from '../state/application/actions'
import { useWalletModalToggle } from '../state/application/hooks'
// import { AppDispatch } from '../state/index'
import { useUserSelectChainId } from '../state/user/hooks'

import { ChainId } from '../config/chainConfig/chainId'

import {useActiveReact} from './useActiveReact'
import {useLogin} from './near'
import {connectXlmWallet} from './stellar'
import {useLoginTrx} from './trx'

export function useConnectWallet () {
  const {account} = useActiveReact()
  // const dispatch = useDispatch<AppDispatch>()
  const {selectNetworkInfo} = useUserSelectChainId()
  const toggleWalletModal = useWalletModalToggle()
  const { connect } = useWallet()
  const {login} = useLogin()
  const {loginXlm} = connectXlmWallet()
  const {loginTrx} = useLoginTrx()
  return useCallback(() => {
    if (selectNetworkInfo?.label === ChainId.TERRA) {
      if (connect) {
        try {
          connect(ConnectType.CHROME_EXTENSION)
        } catch (error) {
          alert('Please install Terra Station!')
        }
      } else {
        alert('Please install Terra Station!')
      }
    } else if (selectNetworkInfo?.label === ChainId.BTC) {
      
    } else if (selectNetworkInfo?.label === ChainId.NAS) {
      
    } else if (
      selectNetworkInfo?.label === ChainId.NEAR
      || selectNetworkInfo?.label === ChainId.NEAR_TEST
    ) {
      if (!account) {
        login()
      } else {
        toggleWalletModal()
        // dispatch(setOpenModal(ApplicationModal.WALLET))
      }
    } else if ([ChainId.XLM, ChainId.XLM_TEST].includes(selectNetworkInfo?.label)) {
      if (!account) {
        loginXlm()
      } else {
        toggleWalletModal()
        // dispatch(setOpenModal(ApplicationModal.WALLET))
      }
    } else if ([ChainId.TRX, ChainId.TRX_TEST].includes(selectNetworkInfo?.label)) {
      // console.log(account)
      if (!account) {
        // console.log(123)
        loginTrx()
      } else {
        toggleWalletModal()
        // dispatch(setOpenModal(ApplicationModal.WALLET))
      }
      // loginTrx()
    } else {
      toggleWalletModal()
    }
  }, [selectNetworkInfo, toggleWalletModal, account])
}