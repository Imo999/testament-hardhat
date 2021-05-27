/* eslint-disable comma-dangle */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const { expect } = require('chai');

describe('Testament Contract', () => {
  let dev, owner, doctor, nextDoctor, Testament, testament, beneficiary, beneficiary2;
  const BASIC_BEQUEATH = ethers.utils.parseEther('5');

  beforeEach(async function () {
    [dev, owner, doctor, nextDoctor, beneficiary, beneficiary2] = await ethers.getSigners();
    Testament = await ethers.getContractFactory('Testament');
    testament = await Testament.connect(dev).deploy(owner.address, doctor.address);
    await testament.deployed();
  });

  describe('Deployment Contract Test', function () {
    it('should set owner and doctor address', async function () {
      expect(await testament.owner()).to.equal(owner.address);
      expect(await testament.doctor()).to.equal(doctor.address);
    });

    it('should revert if owner is the doctor', async function () {
      await expect(Testament.connect(dev).deploy(owner.address, owner.address)).to.be.revertedWith(
        'Testament: You cannot define the owner and the doctor as the same person.'
      );
    });
  });

  describe('Bequeath Test', function () {
    let bequeath;
    let ownerBalance;
    beforeEach(async function () {
      ownerBalance = await owner.getBalance();
      bequeath = await testament.connect(owner).bequeath(beneficiary.address, { value: BASIC_BEQUEATH, gasPrice: 0 });
    });

    it('should emit a Bequeath event', async function () {
      await expect(bequeath).to.emit(testament, 'Bequeath').withArgs(beneficiary.address, BASIC_BEQUEATH);
    });

    it('should increase legacy balances of recipient', async function () {
      expect(await testament.legacyOf(beneficiary.address)).to.equal(BASIC_BEQUEATH);
    });

    it('should decrease balance of owner', async function () {
      expect(await owner.getBalance()).to.equal(ownerBalance.sub(BASIC_BEQUEATH));
    });

    it('should revert if another address than owner call this function (modifier)', async function () {
      await expect(
        testament.connect(beneficiary2).bequeath(beneficiary.address, { value: BASIC_BEQUEATH })
      ).to.be.revertedWith('Testament: You are not allowed to use this function.');
    });
  });

  describe('setDoctor Test', function () {
    let changeDoctor;
    beforeEach(async function () {
      changeDoctor = await testament.connect(owner).setDoctor(nextDoctor.address);
    });

    it('should emit a DoctorChanged event', async function () {
      expect(changeDoctor).to.emit(testament, 'DoctorChanged').withArgs(nextDoctor.address);
    });

    it('should change the doctor', async function () {
      expect(await testament.doctor()).to.equal(nextDoctor.address);
    });

    it('should revert if the owner is set to the doctor', async function () {
      await expect(testament.connect(owner).setDoctor(owner.address)).to.be.revertedWith(
        'Testament: You cannot be set as doctor.'
      );
    });

    it('should revert if another address than owner call this function (modifier)', async function () {
      await expect(testament.connect(doctor).setDoctor(beneficiary2.address)).to.be.revertedWith(
        'Testament: You are not allowed to use this function.'
      );
    });
  });

  describe('contractEnd Test', function () {
    let contractEnded;
    beforeEach(async function () {
      contractEnded = await testament.connect(doctor).contractEnd();
    });

    it('should emit a ContractEnded event', async function () {
      expect(contractEnded).to.emit(testament, 'ContractEnded').withArgs(doctor.address);
    });

    it('should change the state of isContractOver', async function () {
      expect(await testament.isContractOver()).to.equal(true);
    });

    it('should revert if it is not the doctor (modifier)', async function () {
      await expect(testament.connect(beneficiary2).contractEnd()).to.be.revertedWith(
        'Testament: You are not allowed to use this function.'
      );
    });

    it('should revert if contract is already ended', async function () {
      await expect(testament.connect(doctor).contractEnd()).to.be.revertedWith(
        'Testament: The contract is already over.'
      );
    });
  });

  describe('Withdraw Test', function () {
    let withdrawTransaction;
    beforeEach(async function () {
      await testament.connect(owner).bequeath(beneficiary.address, { value: BASIC_BEQUEATH, gasPrice: 0 });
      await testament.connect(doctor).contractEnd();
      withdrawTransaction = await testament.connect(beneficiary).withdraw();
    });
  });
});
